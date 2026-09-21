// services/garmen/maklonTerimaService.ts
import api from "@/services/api";
export const maklonTerimaService = {
  getOutstandingByMkl: (mklNomor: string) =>
    api.get(`/garmen/maklon/terima/by-mkl/${encodeURIComponent(mklNomor)}`),
  save: (payload: any) => api.post("/garmen/maklon/terima", payload),
};
