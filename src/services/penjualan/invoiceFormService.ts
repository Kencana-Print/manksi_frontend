import api from "@/services/api";

const BASE = "/penjualan/invoice-form";

export const invFormService = {
  getById: (nomor: string) => api.get(BASE, { params: { nomor } }),

  save: (data: any) => api.post(BASE, data),
  update: (data: any) => api.put(BASE, data),

  cekStatusPelunasan: (nomor: string) =>
    api.get(`${BASE}/cek-pelunasan`, { params: { nomor } }),

  searchBarang: (
    perushKode: string,
    cusKode: string,
    q = "",
    page = 1,
    limit = 50,
  ) =>
    api.get(`${BASE}/search-barang`, {
      params: { perushKode, cusKode, q, page, limit },
    }),

  loadBarangDetail: (kode: string, perushKode: string) =>
    api.get(`${BASE}/barang-detail`, { params: { kode, perushKode } }),

  getDivisiList: () => api.get(`${BASE}/divisi`),

  getCustomerInfo: (kode: string) =>
    api.get(`${BASE}/customer-info`, { params: { kode } }),

  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/cetak`, { params: { nomor } }),

  validateInvPro: (nomorPro: string, cusKode: string) =>
    api.get(`${BASE}/validate-invpro`, { params: { nomorPro, cusKode } }),

  getRekeningPerush: (perushKode: string) =>
    api.get(`${BASE}/rekening`, { params: { perushKode } }),

  // Lookups
  searchPerusahaan: (q = "") =>
    api.get("/lookups/perusahaan", { params: { q } }),
};
