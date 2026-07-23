import api from "@/services/api";

export const returBeliBahanFormService = {
  getDefault: () =>
    api.get("/garmen/bahan-baku/retur-pembelian-bahan/form/default"),

  getFormData: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/retur-pembelian-bahan/form/${encodeURIComponent(nomor)}`,
    ),

  getBpb: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/retur-pembelian-bahan/form/bpb/${encodeURIComponent(nomor)}`,
    ),

  getBarcode: (barcode: string, bpbNomor: string) =>
    api.get(
      `/garmen/bahan-baku/retur-pembelian-bahan/form/barcode/${encodeURIComponent(barcode)}`,
      { params: { bpbNomor } },
    ),

  create: (payload: any) =>
    api.post("/garmen/bahan-baku/retur-pembelian-bahan/form", payload),

  update: (nomor: string, payload: any) =>
    api.put(
      `/garmen/bahan-baku/retur-pembelian-bahan/form/${encodeURIComponent(nomor)}`,
      payload,
    ),
};
