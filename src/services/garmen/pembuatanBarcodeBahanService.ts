import api from "@/services/api";

export const pembuatanBarcodeBahanService = {
  getBrowse: (params: any) =>
    api.get("/garmen/bahan-baku/pembuatan-barcode-bahan", { params }),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/pembuatan-barcode-bahan/detail/${encodeURIComponent(nomor)}`,
    ),

  delete: (nomor: string) =>
    api.delete(
      `/garmen/bahan-baku/pembuatan-barcode-bahan/delete/${encodeURIComponent(nomor)}`,
    ),
};
