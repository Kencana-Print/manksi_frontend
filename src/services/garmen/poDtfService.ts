import api from "@/services/api";

export const poDtfService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    cabang: string,
    spk: string,
  ) =>
    api.get("/garmen/po-dtf/browse", {
      params: { startDate, endDate, cabang, spk },
    }),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/po-dtf/${encodeURIComponent(nomor)}`),

  getPrintData: (nomor: string) =>
    api.get(`/garmen/po-dtf/print/${encodeURIComponent(nomor)}`),
};
