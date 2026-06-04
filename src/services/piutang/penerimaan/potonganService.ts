import api from "@/services/api";

export const potonganService = {
  getBrowseList: (params: { startDate: string; endDate: string }) =>
    api.get("/piutang/penerimaan/potongan", { params }),

  deletePotongan: (nomor: string) =>
    api.delete(`/piutang/penerimaan/potongan/${encodeURIComponent(nomor)}`),

  checkPengajuan: (nomor: string) =>
    api.get(
      `/piutang/penerimaan/potongan/check-pengajuan/${encodeURIComponent(nomor)}`,
    ),

  requestPin5: (nomor: string, alasan: string) =>
    api.post("/piutang/penerimaan/potongan/request-pin", { nomor, alasan }),

  updatePph23: (
    nomor: string,
    payload: { noBukti: string; tglTrs: string; bruto: number; pph: number },
  ) =>
    api.put(
      `/piutang/penerimaan/potongan/pph23/${encodeURIComponent(nomor)}`,
      payload,
    ),
};
