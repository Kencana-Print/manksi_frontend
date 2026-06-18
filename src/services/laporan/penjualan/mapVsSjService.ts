import api from "@/services/api";

export const mapVsSjService = {
  getBrowse: (params: { startDate: string; endDate: string; divisi: string }) =>
    api.get("/laporan/penjualan/map-vs-sj", { params }),

  getDetail: (mapNomor: string) =>
    api.get(
      `/laporan/penjualan/map-vs-sj/${encodeURIComponent(mapNomor)}/detail`,
    ),

  getAllDetail: (params: {
    startDate: string;
    endDate: string;
    divisi: string;
  }) => api.get("/laporan/penjualan/map-vs-sj/export-all", { params }),
};
