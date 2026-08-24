import api from "@/services/api";

export const poExternalGarmenService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/pembelian/po-external-garmen", { params }),

  getDetail: (nomor: string) =>
    api.get(`/pembelian/po-external-garmen/${encodeURIComponent(nomor)}/detail`),

  deleteData: (nomor: string) =>
    api.delete(`/pembelian/po-external-garmen/${encodeURIComponent(nomor)}`),

  exportHeader: (params: { startDate: string; endDate: string }) =>
    api.get("/pembelian/po-external-garmen/export-header", { params }),

  exportDetail: (params: { startDate: string; endDate: string }) =>
    api.get("/pembelian/po-external-garmen/export-detail", { params }),

  getPengajuanInfo: (nomor: string) =>
    api.get(`/pembelian/po-external-garmen/${encodeURIComponent(nomor)}/pengajuan`),

  ajukanPerubahan: (nomor: string, urut: number, alasan: string) =>
    api.post(`/pembelian/po-external-garmen/${encodeURIComponent(nomor)}/pengajuan`, {
      urut,
      alasan,
    }),
};