import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/spk-close-stbj";

export const spkCloseStbjService = {
  getBrowse: (bulan: number, tahun: number) =>
    api.get(BASE, { params: { bulan, tahun } }),

  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  getAllDetail: (bulan: number, tahun: number) =>
    api.get(`${BASE}/all-detail`, { params: { bulan, tahun } }),
};
