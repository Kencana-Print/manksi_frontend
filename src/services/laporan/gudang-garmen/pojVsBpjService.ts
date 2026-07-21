import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/poj-vs-bpj";

export const pojVsBpjService = {
  getBrowse: (startDate: string, endDate: string, gudang = "", spk = "") =>
    api.get(BASE, { params: { startDate, endDate, gudang, spk } }),

  getAllDetail: (startDate: string, endDate: string, gudang = "", spk = "") =>
    api.get(`${BASE}/all-detail`, {
      params: { startDate, endDate, gudang, spk },
    }),
};
