import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/spk-vs-po";

export const spkVsPoService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get(BASE, { params: { startDate, endDate } }),

  getDetail: (spkNomor: string) =>
    api.get(`${BASE}/${encodeURIComponent(spkNomor)}`),

  getAllDetail: (startDate: string, endDate: string) =>
    api.get(`${BASE}/all-detail`, { params: { startDate, endDate } }),
};
