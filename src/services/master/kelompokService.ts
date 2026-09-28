import api from "@/services/api";

export const kelompokService = {
  getAll: () => api.get("/master/kelompok"),
  getById: (kode: string) =>
    api.get(`/master/kelompok/${encodeURIComponent(kode)}`),
  save: (payload: {
    isEdit: boolean;
    kode: string;
    nama: string;
    keterangan?: string;
  }) =>
    payload.isEdit
      ? api.put(`/master/kelompok/${encodeURIComponent(payload.kode)}`, payload)
      : api.post("/master/kelompok", payload),
  delete: (kode: string) =>
    api.delete(`/master/kelompok/${encodeURIComponent(kode)}`),
};
