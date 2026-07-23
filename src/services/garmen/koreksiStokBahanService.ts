import api from "@/services/api";

export const koreksiStokBahanService = {
  getBrowse: (params: any) =>
    api.get("/garmen/bahan-baku/koreksi-stok", { params }),

  getDataCetak: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/koreksi-stok/cetak/${encodeURIComponent(nomor)}`,
    ),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/koreksi-stok/detail/${encodeURIComponent(nomor)}`,
    ),

  delete: (nomor: string) =>
    api.delete(
      `/garmen/bahan-baku/koreksi-stok/delete/${encodeURIComponent(nomor)}`,
    ),

  requestPin: (payload: { nomor: string; alasan: string }) =>
    api.post("/garmen/bahan-baku/koreksi-stok/request-pin", payload),
};
