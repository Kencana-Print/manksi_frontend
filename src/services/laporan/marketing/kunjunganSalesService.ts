import api from "@/services/api";

export const kunjunganSalesService = {
  getBrowse: (params: { startDate: string; endDate: string; sales?: string }) =>
    api.get("/laporan/marketing/kunjungan-sales", { params }),
};
