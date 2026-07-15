import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

// --- INTERFACES SESUAI PAYLOAD MANKSI ---
interface Gudang {
  kode: string;
  nama: string;
}

interface UserFlags {
  editReport: number;
  lihatBeli: number;
  lihatHarga: number;
  lihatSup: number;
  lihatCus: number;
  isManager: number;
  accKor: number;
  cmo: number;
  cmo3: number;
}

interface User {
  kode: string;
  nama: string;
  cabang: string;
  cabangKaos: string;
  divisi: number;
  bagian: string;
  jabatan: string;
  gudang: {
    jadi: Gudang;
    bahan: Gudang;
  };
  flags: UserFlags;
}

interface Permission {
  id: number;
  name: string;
  path: string;
  view: boolean;
  insert: boolean;
  edit: boolean;
  delete: boolean;
}

interface SpkUrgentItem {
  Spk: string;
  Nama: string;
  Customer?: string;
  Tanggal: string;
  Dateline: string;
  QtyOrder: number;
  QtyJadi: number;

  Divisi?: string;
  Cab?: string;
  Workshop?: string;
}

interface LoginResponse {
  token: string;
  user: User;
  permissions: Permission[];
  spkUrgent: SpkUrgentItem[];
  isDefaultPassword?: boolean;
  specialMessage?: string | null;
  message: string;
}

export const useAuthStore = defineStore(
  "auth",
  () => {
    const router = useRouter();

    // --- STATE ---
    const token = ref<string | null>(null);
    const user = ref<User | null>(null);
    const permissions = ref<Permission[]>([]);
    const spkUrgent = ref<SpkUrgentItem[]>([]);
    const isSessionExpired = ref(false);
    const isOnline = ref(navigator.onLine);
    const approvalPendingTotal = ref(0);
    let heartbeatInterval: number;

    // --- GETTERS ---
    const isTokenExpired = computed(() => {
      if (!token.value) {
        return true;
      }
      try {
        const decoded = jwtDecode(token.value);
        const expirationTime = (decoded.exp ?? 0) * 1000;
        return Date.now() > expirationTime;
      } catch {
        return true;
      }
    });

    const isAuthenticated = computed(
      () => !!token.value && !isTokenExpired.value,
    );
    const userName = computed(() => user.value?.nama || "User");
    const userInitial = computed(() => userName.value.charAt(0).toUpperCase());
    const userCabang = computed(() => user.value?.cabang || "HO-");
    const gudangJadi = computed(
      () => user.value?.gudang.jadi || { kode: "", nama: "" },
    );
    const allowedMenus = computed(() =>
      permissions.value.filter((p) => p.view).map((p) => p.id.toString()),
    );

    // Getters Khusus Flags Manksi
    const canLihatHarga = computed(() => user.value?.flags.lihatHarga === 1);
    const canLihatBeli = computed(() => user.value?.flags.lihatBeli === 1);
    const isManager = computed(() => user.value?.flags.isManager === 1);
    const isCmo = computed(() => user.value?.flags.cmo === 1);
    const canSeeApproval = computed(() =>
      [256, 257, 258, 259, 260, 261, 262, 263].some((id) =>
        permissions.value.filter((p) => p.id === id).some((p) => p.view),
      ),
    );

    // --- CONNECTIVITY HELPERS ---
    const checkServerStatus = async () => {
      try {
        await axios.head("/api/health-check");
        isOnline.value = true;
      } catch {
        isOnline.value = false;
      }
    };

    const initConnectivityCheck = () => {
      window.addEventListener("online", () => (isOnline.value = true));
      window.addEventListener("offline", () => (isOnline.value = false));
      heartbeatInterval = window.setInterval(checkServerStatus, 30_000);
    };

    const clearConnectivityCheck = () => {
      clearInterval(heartbeatInterval);
    };

    // --- ACTIONS ---
    function setLoginData(loginResponse: LoginResponse) {
      token.value = loginResponse.token;
      user.value = loginResponse.user;
      permissions.value = loginResponse.permissions || [];
      spkUrgent.value = loginResponse.spkUrgent || [];

      // Router push akan ditangani di komponen Login.vue agar bisa show modal SPK dulu
    }

    function logout() {
      isSessionExpired.value = false;
      token.value = null;
      user.value = null;
      permissions.value = [];
      spkUrgent.value = [];
      router.push("/login");
    }

    function can(
      menuId: string,
      action: "view" | "insert" | "edit" | "delete",
    ): boolean {
      const idAsNumber = Number.parseInt(menuId, 10);
      return permissions.value
        .filter((p) => p.id === idAsNumber)
        .some((p) => p[action]);
    }

    function handleSessionExpired() {
      if (isSessionExpired.value) {
        return;
      }

      token.value = null;
      user.value = null;
      permissions.value = [];
      spkUrgent.value = [];
      isSessionExpired.value = true;
    }

    function setApprovalPendingTotal(n: number) {
      approvalPendingTotal.value = n;
    }

    return {
      // State
      token,
      user,
      permissions,
      spkUrgent,
      isSessionExpired,
      isOnline,
      approvalPendingTotal,
      // Getters
      isAuthenticated,
      userName,
      userInitial,
      userCabang,
      gudangJadi,
      allowedMenus,
      isTokenExpired,
      canLihatHarga,
      canLihatBeli,
      isManager,
      isCmo,
      canSeeApproval,
      // Actions
      setLoginData,
      logout,
      can,
      handleSessionExpired,
      initConnectivityCheck,
      clearConnectivityCheck,
      setApprovalPendingTotal,
    };
  },
  {
    // Plugin Persisted State agar otomatis save ke localStorage
    persist: {
      storage: localStorage,
      pick: ["token", "user", "permissions"],
    },
  },
);
