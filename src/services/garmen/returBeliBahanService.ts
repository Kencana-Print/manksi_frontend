import api from "@/services/api";

export const returBeliBahanService = {
  getBrowse: (params: any) =>
    api.get("/garmen/bahan-baku/retur-pembelian-bahan", { params }),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/retur-pembelian-bahan/detail/${encodeURIComponent(nomor)}`,
    ),

  delete: (nomor: string) =>
    api.delete(
      `/garmen/bahan-baku/retur-pembelian-bahan/delete/${encodeURIComponent(nomor)}`,
    ),

  getDataCetak: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/retur-pembelian-bahan/cetak/${encodeURIComponent(nomor)}`,
    ),
};
