import api from "@/services/api";

export const pengajuanDanaService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/piutang/pengajuan-dana/browse", { params }),

  getDetail: (nomor: string) =>
    api.get(`/piutang/pengajuan-dana/${encodeURIComponent(nomor)}/detail`),

  deletePengajuan: (nomor: string) =>
    api.delete(`/piutang/pengajuan-dana/${encodeURIComponent(nomor)}`),
};
