import api from "@/services/api";

export const penawaranVsMapService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/laporan/marketing/penawaran-vs-map", { params }),
};
