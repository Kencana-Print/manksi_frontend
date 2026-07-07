import api from "@/services/api";

const BASE = "/garmen/lhk-pola-form";

export const lhkPolaFormService = {
  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),
  create: (payload: any) => api.post(BASE, payload),
  update: (nomor: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),
  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),
  searchSpk: (q: string) =>
    api.get(`${BASE}/lookup/search-spk`, { params: { q } }),
  getSpkByNomor: (nomor: string) =>
    api.get(`${BASE}/lookup/spk/${encodeURIComponent(nomor)}`),
};
