import api from "@/services/api";

export const rekapPiutangService = {
  getBrowse: (params: { endDate: string; perusahaan: string }) =>
    api.get("/laporan/piutang/rekap-piutang", { params }),
};
