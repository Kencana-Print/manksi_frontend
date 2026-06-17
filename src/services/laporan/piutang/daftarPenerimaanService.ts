import api from "@/services/api";

export const daftarPenerimaanService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/laporan/piutang/daftar-penerimaan", { params }),

  getBrowseDetail: (noPenerimaan: string) =>
    api.get(
      `/laporan/piutang/daftar-penerimaan/${encodeURIComponent(noPenerimaan)}/detail`,
    ),
};
