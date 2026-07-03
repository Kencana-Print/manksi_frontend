import api from "@/services/api";

export const approvePoJasaService = {
  getBrowse: (tglAwal: string, tglAkhir: string) =>
    api.get("/garmen/approve-po-jasa", { params: { tglAwal, tglAkhir } }),

  getDetail: (nomor: string) =>
    api.get(`/garmen/approve-po-jasa/detail/${encodeURIComponent(nomor)}`),

  toggleApprove: (nomor: string) =>
    api.post("/garmen/approve-po-jasa/toggle", { nomor }),

  exportExcel: (tglAwal: string, tglAkhir: string) =>
    api.get("/garmen/approve-po-jasa/export", {
      params: { tglAwal, tglAkhir },
      responseType: "blob",
    }),
};
