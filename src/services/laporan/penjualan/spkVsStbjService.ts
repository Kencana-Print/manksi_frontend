import api from "@/services/api";

export const spkVsStbjService = {
  getBrowse: (params: any) =>
    api.get("/laporan/penjualan/spk-vs-stbj", { params }),

  getDetail: (nomor: string) =>
    api.get(
      `/laporan/penjualan/spk-vs-stbj/detail/${encodeURIComponent(nomor)}`,
    ),
};
