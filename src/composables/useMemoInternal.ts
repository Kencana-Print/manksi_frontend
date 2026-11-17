import { ref } from "vue";
import { useToast } from "vue-toastification";
import type { Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { getAppSocket } from "@/composables/useAppSocket";
import {
  memoInternalService,
  type MemoUnreadData,
} from "@/services/tools/memoInternalService";

const SESSION_KEY = "hasSeenMemoInternal";

interface MemoBerubah {
  aksi: "baru" | "hapus" | "ubah";
  id: number;
  userKode?: string;
  userNama?: string;
}

const isOpen = ref(false);
const unreadJumlah = ref(0);
const unreadTerbaru = ref<MemoUnreadData["terbaru"]>([]);
// Naik setiap ada siaran memo; dialog yang sedang terbuka memuat ulang daftarnya
const versiMemo = ref(0);
let started = false;
let boundSocket: Socket | null = null;

const refreshUnread = async (): Promise<number> => {
  try {
    const res = await memoInternalService.getUnread();
    unreadJumlah.value = res.data.data?.jumlah ?? 0;
    unreadTerbaru.value = res.data.data?.terbaru ?? [];
  } catch {
    // hitungan badge tidak kritis; gagal diam saja
  }
  return unreadJumlah.value;
};

export function useMemoInternal() {
  const openMemoDialog = () => {
    isOpen.value = true;
  };

  const closeMemoDialog = () => {
    isOpen.value = false;
  };

  // Dipanggil sekali dari Navbar setelah login
  const initMemoInternal = async () => {
    if (started) return;
    started = true;
    const toast = useToast();
    const authStore = useAuthStore();

    // Pilihan B: dialog terbuka otomatis sekali per sesi bila ada yang belum dibaca
    const jumlah = await refreshUnread();
    if (jumlah > 0 && !sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, "1");
      isOpen.value = true;
    }

    const s = getAppSocket();
    if (boundSocket !== s) {
      boundSocket = s;
      s.on("memo:berubah", async (p: MemoBerubah) => {
        await refreshUnread();
        versiMemo.value++;
        // Pengunggah tidak perlu diberi tahu memonya sendiri
        if (p.aksi !== "baru" || p.userKode === authStore.user?.kode) return;
        // Siaran sampai ke semua klien; hanya memo yang muncul di daftar belum
        // dibaca milik user ini (sudah difilter server) yang boleh ditampilkan.
        const memo = unreadTerbaru.value.find((m) => m.id === p.id);
        if (!memo) return;
        toast.info(
          `Memo Internal baru: ${memo.judul}${p.userNama ? ` (oleh ${p.userNama})` : ""}. Klik untuk membuka.`,
          {
            timeout: false,
            onClick: () => {
              isOpen.value = true;
            },
          },
        );
      });
      // Setelah koneksi pulih, sinkronkan hitungan (ada yang terlewat saat putus)
      s.on("connect", () => {
        void refreshUnread();
        versiMemo.value++;
      });
    }
  };

  // Dipanggil saat user tidak lagi terautentikasi
  const resetMemoInternal = () => {
    started = false;
    boundSocket = null;
    isOpen.value = false;
    unreadJumlah.value = 0;
    unreadTerbaru.value = [];
  };

  return {
    isOpen,
    unreadJumlah,
    versiMemo,
    openMemoDialog,
    closeMemoDialog,
    refreshUnread,
    initMemoInternal,
    resetMemoInternal,
  };
}
