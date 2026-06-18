import api from "@/services/api";

export const spkBelumClosingService = {
  getBrowse: (params: {
    startDate?: string;
    endDate?: string;
    sortByNominal?: string;
  }) => api.get("/laporan/marketing/spk-belum-closing", { params }),
};
