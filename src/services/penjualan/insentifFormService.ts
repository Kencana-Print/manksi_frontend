import api from "@/services/api";

const BASE_URL = "/penjualan/insentif/form";

export const insentifFormService = {
  getCustomerInfo: (kode: string) =>
    api.get(`${BASE_URL}/customer/${encodeURIComponent(kode)}`),

  searchInvoice: (custKode: string, q = "") =>
    api.get(`${BASE_URL}/search-invoice`, { params: { custKode, q } }),

  checkInvoice: (custKode: string, nomor: string) =>
    api.get(`${BASE_URL}/check-invoice`, { params: { custKode, nomor } }),

  save: (payload: any) => api.post(BASE_URL, payload),

  getPrintData: (nomor: string) =>
    api.get(`${BASE_URL}/print/${encodeURIComponent(nomor)}`),
};
