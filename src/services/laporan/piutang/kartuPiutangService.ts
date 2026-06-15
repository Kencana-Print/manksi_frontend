import api from "@/services/api";

export const kartuPiutangService = {
  getBrowse: (params: { endDate: string }) =>
    api.get("/laporan/piutang/kartu-piutang", { params }),

  getInvoiceByCustomer: (cusKode: string, params: { endDate: string }) =>
    api.get(
      `/laporan/piutang/kartu-piutang/${encodeURIComponent(cusKode)}/invoices`,
      { params },
    ),

  getPembayaranByInvoice: (invNomor: string, params: { endDate: string }) =>
    api.get(
      `/laporan/piutang/kartu-piutang/${encodeURIComponent(invNomor)}/pembayaran`,
      { params },
    ),
};
