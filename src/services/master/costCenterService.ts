import api from "@/services/api";

export const costCenterService = {
  getAll: () => api.get("/master/cost-center"),
  getById: (kode: string) =>
    api.get(`/master/cost-center/${encodeURIComponent(kode)}`),
  save: (payload: {
    isEdit: boolean;
    kode: string;
    nama: string;
    detail: { nama: string }[];
  }) => api.post("/master/cost-center", payload),
  delete: (kode: string) =>
    api.delete(`/master/cost-center/${encodeURIComponent(kode)}`),
};
