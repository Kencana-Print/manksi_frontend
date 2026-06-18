import api from "@/services/api";

export const mapVsSpkService = {
  getBrowse: (params: { startDate: string; endDate: string; divisi: string }) =>
    api.get("/laporan/penjualan/map-vs-spk", { params }),
};
