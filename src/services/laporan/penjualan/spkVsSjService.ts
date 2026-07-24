import api from "@/services/api";

export const spkVsSjService = {
  getBrowse: (params: any) =>
    api.get("/laporan/penjualan/spk-vs-sj", { params }),

  getDetail: (nomor: string) =>
    api.get(`/laporan/penjualan/spk-vs-sj/detail/${encodeURIComponent(nomor)}`),
};
