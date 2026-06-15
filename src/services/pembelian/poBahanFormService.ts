import api from "@/services/api";

export const poBahanFormService = {
  validateField: (type: string, value: string) =>
    api.get("/pembelian/po-bahan/form/validate", { params: { type, value } }),

  getSupplierByKode: (kode: string) =>
    api.get(`/pembelian/po-bahan/supplier/${encodeURIComponent(kode)}`),

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
