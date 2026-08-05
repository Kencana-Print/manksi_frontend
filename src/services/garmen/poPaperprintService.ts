import api from "@/services/api";

export const poPaperprintService = {
  getBrowse: (startDate: string, endDate: string, spk: string) =>
    api.get("/garmen/po-paperprint/browse", {
      params: { startDate, endDate, spk },
    }),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/po-paperprint/${encodeURIComponent(nomor)}`),

  getPrintData: (nomor: string) =>
    api.get(`/garmen/po-paperprint/print/${encodeURIComponent(nomor)}`),
};
