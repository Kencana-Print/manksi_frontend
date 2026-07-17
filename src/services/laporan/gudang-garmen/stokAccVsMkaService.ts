import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/stok-acc-vs-mka";

export const stokAccVsMkaService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get(BASE, { params: { startDate, endDate } }),

  getDetail: (kode: string, startDate: string, endDate: string) =>
    api.get(`${BASE}/${encodeURIComponent(kode)}`, {
      params: { startDate, endDate },
    }),

  getAllDetail: (startDate: string, endDate: string) =>
    api.get(`${BASE}/all-detail`, { params: { startDate, endDate } }),
};
