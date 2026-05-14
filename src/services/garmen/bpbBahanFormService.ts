import api from "@/services/api";

export const bpbBahanFormService = {
  validateField: (type: string, value: string) =>
    api.get("/garmen/bahan-baku/bpb-bahan/form/validate", {
      params: { type, value },
    }),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/bpb-bahan/form/detail/${encodeURIComponent(nomor)}`,
    ),

  saveData: (payload: any) =>
    api.post("/garmen/bahan-baku/bpb-bahan/form/save", payload),

  getMaxBarcode: (kode: string, tahun: string) =>
    api.get("/garmen/bahan-baku/bpb-bahan/form/max-barcode", {
      params: { kode, tahun },
    }),
};
