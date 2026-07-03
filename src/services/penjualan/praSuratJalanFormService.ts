import api from "@/services/api";

const BASE = "/penjualan/pra-sj-form";

export const praSjFormService = {
  getById: (praSj: string) => api.get(`${BASE}/detail`, { params: { praSj } }),

  // POST karena butuh kirim array existingRows di body utk cek duplikat
  getDetailSo: (payload: {
    soNomor: string;
    cusKode: string;
    divisi: string;
    currentPraSj?: string;
    existingRows?: any[];
  }) => api.post(`${BASE}/detail-so`, payload),

  searchPerusahaan: (q: string) =>
    api.get(`${BASE}/search-perusahaan`, { params: { q } }),
  getCustomerInfo: (kode: string) =>
    api.get(`${BASE}/customer-info`, { params: { kode } }),
  getAlokasiHistory: (cusKode: string) =>
    api.get(`${BASE}/alokasi-history`, { params: { cusKode } }),
  getDivisiList: () => api.get(`${BASE}/divisi`),

  save: (payload: any) => api.post(BASE, payload),
  update: (payload: any) => api.put(BASE, payload),
};
