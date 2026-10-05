const APP_BASE_PATH = import.meta.env.BASE_URL;
const cleanBase = APP_BASE_PATH.endsWith("/")
  ? APP_BASE_PATH.slice(0, -1)
  : APP_BASE_PATH;

const API_BASE_URL = import.meta.env.VITE_API_URL || `${cleanBase}/api`;
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

export const getFileUrl = (path: string) => `${API_ORIGIN}${path}`;
