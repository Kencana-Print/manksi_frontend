import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/realisasi-minta-bahan";

export const realisasiMintaBahanService = {
  getBrowse: (startDate: string, endDate: string, cab = "ALL", spk = "") =>
    api.get(BASE, { params: { startDate, endDate, cab, spk } }),

  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  getAllDetail: (startDate: string, endDate: string, cab = "ALL", spk = "") =>
    api.get(`${BASE}/all-detail`, { params: { startDate, endDate, cab, spk } }),
};
