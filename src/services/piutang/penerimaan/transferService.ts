import api from "@/services/api";

export const transferService = {
  getBrowseList: (params: { startDate: string; endDate: string }) =>
    api.get("/piutang/penerimaan/transfer", { params }),

  deleteTransfer: (nomor: string) =>
    api.delete(`/piutang/penerimaan/transfer/${encodeURIComponent(nomor)}`),

  checkPengajuan: (nomor: string) =>
    api.get(
      `/piutang/penerimaan/transfer/check-pengajuan/${encodeURIComponent(nomor)}`,
    ),

  requestPin5: (nomor: string, alasan: string) =>
    api.post("/piutang/penerimaan/transfer/request-pin", { nomor, alasan }),
};
