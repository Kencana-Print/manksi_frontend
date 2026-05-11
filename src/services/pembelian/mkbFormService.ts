import api from "@/services/api";

export const mkbFormService = {
  getDetail: (nomor: string) =>
    api.get(`/pembelian/mkb/form/detail`, { params: { nomor } }),

  saveData: (payload: any) => api.post(`/pembelian/mkb/form/save`, payload),

  getPrintData: (nomor: string) =>
    api.get(`/pembelian/mkb/form/print`, { params: { nomor } }),

  checkSpk: (nomorSpk: string, mkbNomor: string = "") =>
    api.get(`/pembelian/mkb/form/check-spk`, {
      params: { spk: nomorSpk, mkb: mkbNomor },
    }),
};
