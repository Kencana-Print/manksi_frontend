import api from "@/services/api";

export const laporanDesainMarketingService = {
  getReport: (filters: {
    startDate: string;
    endDate: string;
    desainer?: string;
    customer?: string;
    jenisPekerjaan?: string;
    status?: string;
  }) =>
    api.get("/laporan/marketing/laporan-desain-marketing", {
      params: filters,
    }),

  getSummary: (filters: {
    startDate: string;
    endDate: string;
    desainer?: string;
    customer?: string;
    jenisPekerjaan?: string;
    status?: string;
  }) =>
    api.get("/laporan/marketing/laporan-desain-marketing/summary", {
      params: filters,
    }),
};
