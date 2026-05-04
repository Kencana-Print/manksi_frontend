import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { useAuthStore } from '@/stores/authStore'

// Mengambil base URL dari vite.config.ts (jika ada)
const APP_BASE_PATH = import.meta.env.BASE_URL
const cleanBase = APP_BASE_PATH.endsWith('/')
  ? APP_BASE_PATH.slice(0, -1)
  : APP_BASE_PATH

// Secara default di development, ini akan mengarah ke endpoint backend Node.js kamu
const API_BASE_URL = import.meta.env.VITE_API_URL || `${cleanBase}/api`

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Hindari circular dependency yang berat, Pinia handle dengan baik di dalam fungsi
    const authStore = useAuthStore()
    const token = authStore.token

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  error => {
    return Promise.reject(error)
  },
)

api.interceptors.response.use(
  response => response,
  error => {
    const authStore = useAuthStore()

    // Tangkap error 401 Unauthorized (Token Habis / Invalid)
    if (error.response && error.response.status === 401 // Kecualikan URL login agar tidak looping session expired saat gagal login
      && !error.config.url.includes('/auth/login')) {
      authStore.handleSessionExpired()
    }

    return Promise.reject(error)
  },
)

export default api
