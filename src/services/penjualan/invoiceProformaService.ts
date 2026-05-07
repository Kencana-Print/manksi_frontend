import api from "@/services/api";

export const invoiceProformaService = {
  getBrowseList: (startDate: string, endDate: string) =>
    api.get("/penjualan/invoice-proforma", {
      params: { startDate, endDate },
    }),

  getExportDetail: (startDate: string, endDate: string) =>
    api.get("/penjualan/invoice-proforma/export-detail", {
      params: { startDate, endDate },
    }),

  deleteData: (nomor: string) =>
    api.delete(`/penjualan/invoice-proforma/${encodeURIComponent(nomor)}`),

  ajukanPerubahan: (payload: { nomor: string; alasan: string }) =>
    api.post("/penjualan/invoice-proforma/pengajuan", payload),
};
