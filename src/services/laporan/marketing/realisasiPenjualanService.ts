import api from "@/services/api";

export const realisasiPenjualanService = {
  getBrowse: (params: {
    startDate?: string;
    endDate?: string;
    sortByNominal?: string;
  }) => api.get("/laporan/marketing/realisasi-penjualan", { params }),
};
