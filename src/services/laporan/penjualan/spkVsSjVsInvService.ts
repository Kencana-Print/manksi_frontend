import api from "@/services/api";

export const spkVsSjVsInvService = {
  getBrowse: (params: any) =>
    api.get("/laporan/penjualan/spk-vs-sj-vs-inv", { params }),

  getExportData: (params: any) =>
    api.get("/laporan/penjualan/spk-vs-sj-vs-inv/export-data", { params }),

  getDetail: (nomor: string) =>
    api.get(
      `/laporan/penjualan/spk-vs-sj-vs-inv/detail/${encodeURIComponent(nomor)}`,
    ),
};
