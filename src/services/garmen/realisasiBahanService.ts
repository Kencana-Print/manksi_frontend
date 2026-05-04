import api from "@/services/api";

export const realisasiBahanService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get("/garmen/bahan-baku/realisasi-minta", {
      params: { startDate, endDate },
    }),

  getDetail: (nomor: string) =>
    api.get(`/garmen/bahan-baku/realisasi-minta/${encodeURIComponent(nomor)}`),

  getExportDetail: (startDate: string, endDate: string) =>
    api.get("/garmen/bahan-baku/realisasi-minta/export-detail", {
      params: { startDate, endDate },
    }),

  deleteData: (nomor: string) =>
    api.delete(
      `/garmen/bahan-baku/realisasi-minta/${encodeURIComponent(nomor)}`,
    ),

  ajukanPerubahan: (payload: {
    nomor: string;
    urut: number;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) =>
    api.post("/garmen/bahan-baku/realisasi-minta/ajukan-perubahan", payload),
};
