import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";

// Satu koneksi socket untuk seluruh aplikasi (Komitmen Kirim, Memo Internal, dst.)
let socket: Socket | null = null;

export const getAppSocket = (): Socket => {
  if (socket) return socket;
  const authStore = useAuthStore();
  const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
  socket = io(baseUrl, {
    auth: { token: authStore.token },
    transports: ["websocket", "polling"],
  });
  return socket;
};

// Dipanggil saat user tidak lagi terautentikasi supaya identitas lama tidak terbawa
export const disconnectAppSocket = () => {
  socket?.disconnect();
  socket = null;
};
