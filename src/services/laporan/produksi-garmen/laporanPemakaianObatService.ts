import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/pemakaian-obat";

export const laporanPemakaianObatService = {
  getBrowse: (startDate: string, endDate: string, cab = "P04", spk = "") =>
    api.get(BASE, { params: { startDate, endDate, cab, spk } }),

  getDetail: (
    kode: string,
    startDate: string,
    endDate: string,
    cab = "P04",
    spk = "",
  ) =>
    api.get(`${BASE}/${encodeURIComponent(kode)}`, {
      params: { startDate, endDate, cab, spk },
    }),

  getAllDetail: (startDate: string, endDate: string, cab = "P04", spk = "") =>
    api.get(`${BASE}/all-detail`, { params: { startDate, endDate, cab, spk } }),
};
