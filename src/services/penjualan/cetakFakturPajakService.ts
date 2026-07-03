import api from "@/services/api";

const BASE = "/penjualan/cetak-faktur-pajak";

export const cetakFakturPajakService = {
  checkNomor: (nomor: string) =>
    api.get(`${BASE}/check-nomor`, { params: { nomor } }),

  getDataCetak: (nomor: string, noSeri = "") =>
    api.get(`${BASE}/data-cetak`, { params: { nomor, noSeri } }),

  cetak: (nomor: string, noSeri: string) =>
    api.post(`${BASE}/cetak`, { nomor, noSeri }),

  searchInvoice: (q = "", page = 1, limit = 50) =>
    api.get(`${BASE}/search`, { params: { q, page, limit } }),
};
