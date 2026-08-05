import api from "@/services/api";

export const pemakaianObatService = {
  getBrowse: (startDate: string, endDate: string, cabang: string) =>
    api.get("/garmen/pemakaian-obat/browse", {
      params: { startDate, endDate, cabang },
    }),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/pemakaian-obat/${encodeURIComponent(nomor)}`),

  getPrintData: (nomor: string) =>
    api.get(`/garmen/pemakaian-obat/print/${encodeURIComponent(nomor)}`),
};
