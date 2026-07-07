import api from "@/services/api";

const BASE = "/garmen/lhk-pola";

export const lhkPolaService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get(BASE, { params }),
  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),
  save: (payload: any) => api.post(BASE, payload),
  update: (nomor: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),
  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),
};
