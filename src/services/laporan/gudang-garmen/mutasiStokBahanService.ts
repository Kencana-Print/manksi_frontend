import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/mutasi-stok-bahan";

export const mutasiStokBahanService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    gudang = "",
    tampilkanKosong = false,
  ) =>
    api.get(BASE, {
      params: { startDate, endDate, gudang, tampilkanKosong },
    }),

  getDetail: (kode: string, startDate: string, endDate: string, gudang = "") =>
    api.get(`${BASE}/${encodeURIComponent(kode)}`, {
      params: { startDate, endDate, gudang },
    }),

  getAllDetail: (
    startDate: string,
    endDate: string,
    gudang = "",
    tampilkanKosong = false,
  ) =>
    api.get(`${BASE}/all-detail`, {
      params: { startDate, endDate, gudang, tampilkanKosong },
    }),
};
