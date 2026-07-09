import api from "@/services/api";

const BASE = "/ppic/proof-form";

export const proofFormService = {
  getMeta: () => api.get(`${BASE}/meta`),
  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),
  searchSpk: (q: string) =>
    api.get(`${BASE}/lookup/search-spk`, { params: { q } }),
  getSpkInfo: (nomor: string) =>
    api.get(`${BASE}/lookup/spk-info/${encodeURIComponent(nomor)}`),
  checkDuplikat: (lini: string, spkNomor: string, excludeNomor = "") =>
    api.get(`${BASE}/lookup/check-duplikat`, {
      params: { lini, spkNomor, excludeNomor },
    }),
  searchNomor: (cab: string, q: string) =>
    api.get(`${BASE}/lookup/search-nomor`, { params: { cab, q } }),
  loadBahan: (kode: string, lini: string) =>
    api.get(`${BASE}/lookup/load-bahan`, { params: { kode, lini } }),
  searchBahan: (lini: string, q: string) =>
    api.get(`${BASE}/lookup/search-bahan`, { params: { lini, q } }),
  create: (payload: any) => api.post(BASE, payload),
  update: (nomor: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),
};
