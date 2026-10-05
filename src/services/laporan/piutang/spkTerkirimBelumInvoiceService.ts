import api from "@/services/api";

export const spkTerkirimBelumInvoiceService = {
  getBrowse: (params: {
    endDate: string;
    startDate?: string;
    perusahaan?: string;
  }) => api.get("/laporan/piutang/spk-terkirim-belum-invoice", { params }),
};
