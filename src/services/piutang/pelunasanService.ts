import api from "@/services/api";

export const pelunasanService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/piutang/pelunasan", { params }),

  getDetail: (nomor: string) =>
    api.get(`/piutang/pelunasan/${encodeURIComponent(nomor)}/detail`),

  getAllDetail: (params: { startDate: string; endDate: string }) =>
    api.get("/piutang/pelunasan/export-all", { params }),

  deletePelunasan: (nomor: string) =>
    api.delete(`/piutang/pelunasan/${encodeURIComponent(nomor)}`),

  cekKelayakanPIN: (nomor: string) =>
    api.get(`/piutang/pelunasan/${encodeURIComponent(nomor)}/cek-pengajuan`),

  requestPIN5: (nomor: string, alasan: string) =>
    api.post(`/piutang/pelunasan/${encodeURIComponent(nomor)}/request-pin`, {
      alasan,
    }),
};
