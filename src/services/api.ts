import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "@/stores/authStore";
import { isFreshActive } from "@/utils/freshMode";

// Mengambil base URL dari vite.config.ts (jika ada)
const APP_BASE_PATH = import.meta.env.BASE_URL;
const cleanBase = APP_BASE_PATH.endsWith("/")
  ? APP_BASE_PATH.slice(0, -1)
  : APP_BASE_PATH;

// Secara default di development, ini akan mengarah ke endpoint backend Node.js kamu
const API_BASE_URL = import.meta.env.VITE_API_URL || `${cleanBase}/api`;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Hindari circular dependency yang berat, Pinia handle dengan baik di dalam fungsi
    const authStore = useAuthStore();
    const token = authStore.token;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Tombol Refresh dashboard: minta server melewati simpanan cache
    if (isFreshActive() && config.headers) {
      config.headers["X-Fresh"] = "1";
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/** Clamp floating-point noise (|v| < 1e-10) → 0, applied recursively to plain JSON objects/arrays. */
const sanitizeNumbers = (v: unknown): unknown => {
  if (typeof v === "number") return Math.abs(v) < 1e-10 ? 0 : v;
  if (Array.isArray(v)) return v.map(sanitizeNumbers);
  if (v !== null && typeof v === "object") {
    const proto = Object.getPrototypeOf(v);
    if (proto !== Object.prototype && proto !== null) return v;
    const o = v as Record<string, unknown>;
    for (const k in o) o[k] = sanitizeNumbers(o[k]);
  }
  return v;
};

api.interceptors.response.use(
  (response) => {
    if (response.data !== null && typeof response.data === "object") {
      response.data = sanitizeNumbers(response.data);
    }
    return response;
  },
  (error) => {
    const authStore = useAuthStore();

    // Tangkap error 401 Unauthorized (Token Habis / Invalid)
    if (
      error.response &&
      error.response.status === 401 && // Kecualikan URL login agar tidak looping session expired saat gagal login
      !error.config.url.includes("/auth/login")
    ) {
      authStore.handleSessionExpired();
    }

    return Promise.reject(error);
  },
);

export default api;
