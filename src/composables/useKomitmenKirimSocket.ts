// src/composables/useKomitmenKirimSocket.ts
import { ref, onUnmounted } from "vue";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

interface PresenceUser {
  kode: string;
  nama: string;
  bagian: string;
}

// ── Semua state koneksi jadi singleton di level module — supaya
// konsisten di mana pun/berapa kali pun composable ini dipanggil,
// tidak terikat ke instance komponen tertentu. ──
let socket: Socket | null = null;
const presenceList = ref<PresenceUser[]>([]);
const isConnected = ref(false);

const connect = () => {
  if (socket) return socket;
  const authStore = useAuthStore();
  const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
  socket = io(baseUrl, {
    auth: { token: authStore.token },
    transports: ["websocket", "polling"],
  });

  socket.on("connect", () => {
    isConnected.value = true;
  });
  socket.on("disconnect", () => {
    isConnected.value = false;
    presenceList.value = []; // ⬅ reset saat koneksi putus, biar tidak stale
  });
  socket.on("pjw:presence", (list: PresenceUser[]) => {
    presenceList.value = list;
  });

  return socket;
};

export function useKomitmenKirimSocket() {
  let joinedRoom: string | null = null;
  const registeredHandlers: {
    event: string;
    handler: (...args: any[]) => void;
  }[] = [];

  const joinRoom = (pjwNomor: string) => {
    if (!pjwNomor) return;
    const s = connect();
    joinedRoom = pjwNomor;
    if (s.connected) {
      s.emit("pjw:join", pjwNomor);
    } else {
      s.once("connect", () => s.emit("pjw:join", pjwNomor));
    }
  };

  const leaveRoom = () => {
    if (socket && joinedRoom) {
      socket.emit("pjw:leave", joinedRoom);
      presenceList.value = presenceList.value.filter(
        (u) => u.kode !== useAuthStore().user?.kode,
      ); // ⬅ optimistic clear diri sendiri, server akan koreksi lewat broadcast
      joinedRoom = null;
    }
    registeredHandlers.forEach(({ event, handler }) =>
      socket?.off(event, handler),
    );
    registeredHandlers.length = 0;
  };

  const on = (event: string, handler: (...args: any[]) => void) => {
    const s = connect();
    s.on(event, handler);
    registeredHandlers.push({ event, handler });
  };

  onUnmounted(() => {
    leaveRoom();
  });

  const emitFieldFocus = (pjwNomor: string, pjwdId: number, field: string) => {
    socket?.emit("pjw:field-focus", { pjwNomor, pjwdId, field });
  };
  const emitFieldBlur = (pjwNomor: string, pjwdId: number, field: string) => {
    socket?.emit("pjw:field-blur", { pjwNomor, pjwdId, field });
  };

  return {
    presenceList,
    isConnected,
    joinRoom,
    leaveRoom,
    on,
    emitFieldFocus,
    emitFieldBlur,
  };
}
