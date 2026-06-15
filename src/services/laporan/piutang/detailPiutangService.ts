import api from "@/services/api";

export const detailPiutangService = {
  getBrowse: (params: { endDate: string }) =>
    api.get("/laporan/piutang/detail-piutang", { params }),

  getBrowseDetail: (invNomor: string, params: { endDate: string }) =>
    api.get(
      `/laporan/piutang/detail-piutang/${encodeURIComponent(invNomor)}/detail`,
      { params },
    ),
};
