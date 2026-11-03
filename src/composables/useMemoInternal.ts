import { ref } from "vue";
import { useToast } from "vue-toastification";
import type { Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { getAppSocket } from "@/composables/useAppSocket";
import { memoInternalService } from "@/services/tools/memoInternalService";

const SESSION_KEY = "hasSeenMemoInternal";

interface MemoBerubah {
  aksi: "baru" | "hapus";
  id: number;
  judul?: string;
  tanggal?: string;
  userKode?: string;
  userNama?: string;
}

const isOpen = ref(false);
const unreadJumlah = ref(0);
let started = false;
let boundSocket: Socket | null = null;

const refreshUnread = async (): Promise<number> => {
  try {
    const res = await memoInternalService.getUnread();
    unreadJumlah.value = res.data.data?.jumlah ?? 0;
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
      s.on("memo:berubah", (p: MemoBerubah) => {
        void refreshUnread();
        // Pengunggah tidak perlu diberi tahu memonya sendiri
        if (p.aksi === "baru" && p.userKode !== authStore.user?.kode) {
          toast.info(
            `Memo Internal baru: ${p.judul ?? ""}${p.userNama ? ` (oleh ${p.userNama})` : ""}. Klik untuk membuka.`,
            {
              timeout: false,
              onClick: () => {
                isOpen.value = true;
              },
            },
          );
        }
      });
      // Setelah koneksi pulih, sinkronkan hitungan (ada yang terlewat saat putus)
      s.on("connect", () => {
        void refreshUnread();
      });
    }
  };

  // Dipanggil saat user tidak lagi terautentikasi
  const resetMemoInternal = () => {
    started = false;
    boundSocket = null;
    isOpen.value = false;
    unreadJumlah.value = 0;
  };

  return {
    isOpen,
    unreadJumlah,
    openMemoDialog,
    closeMemoDialog,
    refreshUnread,
    initMemoInternal,
    resetMemoInternal,
  };
}
