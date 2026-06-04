import api from "@/services/api";

export const giroService = {
  getBrowseList: (params: { startDate: string; endDate: string }) =>
    api.get("/piutang/penerimaan/giro", { params }),

  checkPengajuan: (nomor: string) =>
    api.get(
      `/piutang/penerimaan/giro/check-pengajuan/${encodeURIComponent(nomor)}`,
    ),

  deleteGiro: (nomor: string) =>
    api.delete(`/piutang/penerimaan/giro/${encodeURIComponent(nomor)}`),

  requestPin5: (nomor: string, alasan: string) =>
    api.post("/piutang/penerimaan/giro/request-pin", { nomor, alasan }),
};
