import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/kartu-stok-barangjadi";

export const kartuStokBarangJadiService = {
  getBrowse: (startDate: string, endDate: string, kode: string, gudang = "") =>
    api.get(BASE, { params: { startDate, endDate, kode, gudang } }),

  getDetail: (kode: string, startDate: string, endDate: string, gudang = "") =>
    api.get(`${BASE}/${encodeURIComponent(kode)}`, {
      params: { startDate, endDate, gudang },
    }),

  getAllDetail: (
    startDate: string,
    endDate: string,
    kode: string,
    gudang = "",
  ) =>
    api.get(`${BASE}/all-detail`, {
      params: { startDate, endDate, kode, gudang },
    }),
};
