import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/spkv-realisasiv-lhkcutt";

export const spkVsRealisasiVsLhkCuttService = {
  getBrowse: (startDate: string, endDate: string, spk = "", isMap = false) =>
    api.get(BASE, {
      params: { startDate, endDate, spk, map: isMap },
    }),

  getDetail: (spk: string) => api.get(`${BASE}/${encodeURIComponent(spk)}`),

  getAllDetail: (startDate: string, endDate: string, spk = "", isMap = false) =>
    api.get(`${BASE}/all-detail`, {
      params: { startDate, endDate, spk, map: isMap },
    }),
};
