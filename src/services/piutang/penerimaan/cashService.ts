import api from "@/services/api";

export const cashService = {
  getBrowseList: (params: { startDate: string; endDate: string }) =>
    api.get("/piutang/penerimaan/cash", { params }),

  deleteCash: (nomor: string) =>
    api.delete(`/piutang/penerimaan/cash/${encodeURIComponent(nomor)}`),

  checkPengajuan: (nomor: string) =>
    api.get(
      `/piutang/penerimaan/cash/check-pengajuan/${encodeURIComponent(nomor)}`,
    ),

  requestPin5: (nomor: string, alasan: string) =>
    api.post("/piutang/penerimaan/cash/request-pin", { nomor, alasan }),
};
