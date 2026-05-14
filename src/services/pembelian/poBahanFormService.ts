import api from "@/services/api";

export const poBahanFormService = {
  validateField: (type: string, value: string) =>
    api.get("/pembelian/po-bahan/form/validate", { params: { type, value } }),

  getDetail: (nomor: string) =>
    api.get(`/pembelian/po-bahan/form/detail/${encodeURIComponent(nomor)}`),

  getDetailMkb(nomor: string) {
    return api.get(
      `/pembelian/po-bahan/form/mkb-detail/${encodeURIComponent(nomor)}`,
    );
  },

  saveData: (payload: any) =>
    api.post("/pembelian/po-bahan/form/save", payload),
};
