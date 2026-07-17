import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/standart-babaran-vs-realisasi";

export const standartBabaranVsRealisasiService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    cabang = "ALL",
    mode = "spk",
  ) => api.get(BASE, { params: { startDate, endDate, cabang, mode } }),

  getDetail: (
    nomor: string,
    startDate: string,
    endDate: string,
    cabang = "ALL",
    mode = "spk",
  ) =>
    api.get(`${BASE}/${encodeURIComponent(nomor)}`, {
      params: { startDate, endDate, cabang, mode },
    }),

  getAllDetail: (
    startDate: string,
    endDate: string,
    cabang = "ALL",
    mode = "spk",
  ) =>
    api.get(`${BASE}/all-detail`, {
      params: { startDate, endDate, cabang, mode },
    }),
};
