import api from "@/services/api";

const BASE = "/penjualan/sj-tak-normal-form";

export const sjTakNormalFormService = {
  checkNomor: (nomor: string) =>
    api.get(`${BASE}/check-nomor`, { params: { nomor } }),

  loadBarangDetail: (kode: string, divisi: string) =>
    api.get(`${BASE}/barang-detail`, { params: { kode, divisi } }),

  searchBarang: (params: {
    invPro?: string;
    cusKode?: string;
    divisi: string;
    q?: string;
    page?: number;
    limit?: number;
  }) => api.get(`${BASE}/search-barang`, { params }),

  getSpkCustomer: (kode: string) =>
    api.get(`${BASE}/spk-customer`, { params: { kode } }),

  getCustomerInfo: (kode: string) =>
    api.get(`${BASE}/customer-info`, { params: { kode } }),

  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/data-cetak`, { params: { nomor } }),

  searchPerusahaan: (q: string) =>
    api.get(`${BASE}/search-perusahaan`, { params: { q } }),

  getDivisiList: () => api.get(`${BASE}/divisi`),

  save: (payload: any) => api.post(BASE, payload),
  update: (payload: any) => api.put(BASE, payload),
};
