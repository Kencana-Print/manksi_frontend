import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/kartu-stok-bahan";

export const kartuStokBahanService = {
  getBrowse: (startDate: string, endDate: string, kodeBahan = "") =>
    api.get(BASE, { params: { startDate, endDate, kodeBahan } }),

  getDetail: (kode: string, startDate: string, endDate: string) =>
    api.get(`${BASE}/${encodeURIComponent(kode)}`, {
      params: { startDate, endDate },
    }),

  getAllDetail: (startDate: string, endDate: string, kodeBahan = "") =>
    api.get(`${BASE}/all-detail`, {
      params: { startDate, endDate, kodeBahan },
    }),
};
