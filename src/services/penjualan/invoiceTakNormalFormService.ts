import api from "@/services/api";

const BASE = "/penjualan/invoice-tak-normal-form";

export const invTakNormalFormService = {
  getById: (nomor: string) => api.get(`${BASE}/detail`, { params: { nomor } }),

  searchBarang: (cusKode: string, q = "") =>
    api.get(`${BASE}/search-barang`, { params: { cusKode, q } }),
  loadBarangDetail: (kode: string) =>
    api.get(`${BASE}/barang-detail`, { params: { kode } }),

  searchPerusahaan: (q: string) =>
    api.get(`${BASE}/search-perusahaan`, { params: { q } }),
  getCustomerInfo: (kode: string) =>
    api.get(`${BASE}/customer-info`, { params: { kode } }),
  getRekeningPerush: (perushKode: string) =>
    api.get(`${BASE}/rekening`, { params: { perushKode } }),
  getDivisiList: () => api.get(`${BASE}/divisi`),

  // F1 = spanduk, F4 = garmen
  getInvoiceNormalList: (
    divisiGroup: "spanduk" | "garmen",
    q = "",
    page = 1,
    limit = 50,
  ) =>
    api.get(`${BASE}/invoice-normal-list`, {
      params: { divisiGroup, q, page, limit },
    }),
  validateInvoiceNormal: (nomor: string, currentNomor = "") =>
    api.get(`${BASE}/validate-invoice-normal`, {
      params: { nomor, currentNomor },
    }),
  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/data-cetak`, { params: { nomor } }),

  save: (payload: any) => api.post(BASE, payload),
  update: (payload: any) => api.put(BASE, payload),
};
