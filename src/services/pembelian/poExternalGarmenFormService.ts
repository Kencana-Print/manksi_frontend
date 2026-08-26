import api from "@/services/api";

export const poExternalGarmenFormService = {
  getInit: () => api.get("/pembelian/po-external-garmen/form/init"),

  getForm: (nomor: string) =>
    api.get(`/pembelian/po-external-garmen/form/${encodeURIComponent(nomor)}`),

  getSpkDetail: (nomor: string, isNewMode: boolean) =>
    api.get(
      `/pembelian/po-external-garmen/form/spk/${encodeURIComponent(nomor)}`,
      { params: { isNewMode } },
    ),

  getSupplierByKode: (kode: string) =>
    api.get(
      `/pembelian/po-external-garmen/form/supplier/${encodeURIComponent(kode)}`,
    ),

  getRekeningList: (q?: string) =>
    api.get("/pembelian/po-external-garmen/form/rekening", { params: { q } }),

  saveData: (payload: { isNewMode: boolean; data: any }) =>
    api.post("/pembelian/po-external-garmen/form/save", payload),

  getCetak: (nomor: string) =>
    api.get(
      `/pembelian/po-external-garmen/form/${encodeURIComponent(nomor)}/cetak`,
    ),
};
