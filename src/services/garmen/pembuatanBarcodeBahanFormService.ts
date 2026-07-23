import api from "@/services/api";

export const pembuatanBarcodeBahanFormService = {
  getDefault: () =>
    api.get("/garmen/bahan-baku/pembuatan-barcode-bahan/form/default"),

  getFormData: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/pembuatan-barcode-bahan/form/${encodeURIComponent(nomor)}`,
    ),

  getBarang: (kode: string) =>
    api.get(
      `/garmen/bahan-baku/pembuatan-barcode-bahan/form/barang/${encodeURIComponent(kode)}`,
    ),

  generateRoll: (payload: {
    kode: string;
    nama: string;
    roll: number;
    tanggal: string;
  }) =>
    api.post(
      "/garmen/bahan-baku/pembuatan-barcode-bahan/form/generate-roll",
      payload,
    ),

  getBpbOrRetur: (nomor: string, tanggal: string) =>
    api.get(
      `/garmen/bahan-baku/pembuatan-barcode-bahan/form/bpb-retur/${encodeURIComponent(nomor)}`,
      { params: { tanggal } },
    ),

  create: (payload: any) =>
    api.post("/garmen/bahan-baku/pembuatan-barcode-bahan/form", payload),

  update: (nomor: string, payload: any) =>
    api.put(
      `/garmen/bahan-baku/pembuatan-barcode-bahan/form/${encodeURIComponent(nomor)}`,
      payload,
    ),

  saveRowQty: (payload: any) =>
    api.post(
      "/garmen/bahan-baku/pembuatan-barcode-bahan/form/save-row-qty",
      payload,
    ),
};
