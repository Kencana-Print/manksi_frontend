// src/composables/useKomitmenKirimSocket.ts
import { ref, onUnmounted } from "vue";
import type { Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { getAppSocket } from "@/composables/useAppSocket";

interface PresenceUser {
  kode: string;
  nama: string;
  bagian: string;
}

// ── State presence singleton di level module. Koneksi socket sendiri
// kini dibagi lewat useAppSocket; listener presence dipasang sekali
// per instance socket (instance baru muncul setelah logout/login). ──
let socket: Socket | null = null;
let boundTo: Socket | null = null;
const presenceList = ref<PresenceUser[]>([]);
const isConnected = ref(false);

const connect = () => {
  const s = getAppSocket();
  socket = s;
  if (boundTo !== s) {
    boundTo = s;
    isConnected.value = s.connected;
    s.on("connect", () => {
      isConnected.value = true;
    });
    s.on("disconnect", () => {
      isConnected.value = false;
      presenceList.value = []; // ⬅ reset saat koneksi putus, biar tidak stale
    });
    s.on("pjw:presence", (list: PresenceUser[]) => {
      presenceList.value = list;
    });
  }
  return s;
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
