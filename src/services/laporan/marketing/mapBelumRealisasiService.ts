import api from "@/services/api";

export const mapBelumRealisasiService = {
  getBrowse: (params: {
    startDate?: string;
    endDate?: string;
    sortByNominal?: string;
  }) => api.get("/laporan/marketing/map-belum-realisasi", { params }),
};
