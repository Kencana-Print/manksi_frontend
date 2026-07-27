import api from "@/services/api";

const BASE = "/garmen/po-internal-spk/po-internal-form";

export const poInternalSpkFormService = {
  getDefaultGudang: () => api.get(`${BASE}/default-gudang`),

  checkPabrik: (kode: string, other?: string) =>
    api.get(`${BASE}/check-pabrik`, { params: { kode, other } }),

  checkSpk: (nomor: string) =>
    api.get(`${BASE}/check-spk`, { params: { nomor } }),

  checkJasa: (kode: string, nomorSpk?: string) =>
    api.get(`${BASE}/check-jasa`, { params: { kode, nomorSpk } }),

  loadBahan: (payload: {
    kode: string;
    nomorSpk: string;
    jasa: string;
    gdgAsal: string;
    poiNomor?: string;
    existingRows?: { kode: string; size: string }[];
  }) => api.post(`${BASE}/load-bahan`, payload),

  getById: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  save: (payload: any) => api.post(`${BASE}/save`, payload),

  getPrintData: (nomor: string) =>
    api.get(`${BASE}/print/${encodeURIComponent(nomor)}`),
};
