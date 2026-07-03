import api from "@/services/api";

const BASE = "/penjualan/cetak-kuitansi";

export const cetakKuitansiService = {
  getBrowse: (tglAwal: string, tglAkhir: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir } }),

  searchInvoice: (q = "", page = 1, limit = 50) =>
    api.get(`${BASE}/search-invoice`, { params: { q, page, limit } }),

  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/data-cetak`, { params: { nomor } }),

  cetak: (nomor: string) => api.post(`${BASE}/cetak`, { nomor }),
};
