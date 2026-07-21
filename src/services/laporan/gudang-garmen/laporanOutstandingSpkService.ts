import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/lap-outstanding-spk";

export const laporanOutstandingSpkService = {
  getBrowse: () => api.get(BASE),

  getDetail: (spk: string) => api.get(`${BASE}/${encodeURIComponent(spk)}`),

  getAllDetail: () => api.get(`${BASE}/all-detail`),
};
