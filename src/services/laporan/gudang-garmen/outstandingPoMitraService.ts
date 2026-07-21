import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/outstanding-po-mitra";

export const outstandingPoMitraService = {
  getBrowse: (startDate: string, endDate: string, cab = "ALL") =>
    api.get(BASE, { params: { startDate, endDate, cab } }),

  getDetail: (kode: string, startDate: string, endDate: string, cab = "ALL") =>
    api.get(`${BASE}/${encodeURIComponent(kode)}`, {
      params: { startDate, endDate, cab },
    }),

  getAllDetail: (startDate: string, endDate: string, cab = "ALL") =>
    api.get(`${BASE}/all-detail`, { params: { startDate, endDate, cab } }),
};
