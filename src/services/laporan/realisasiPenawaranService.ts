import api from "@/services/api";

export const realisasiPenawaranService = {
  // Ambil data agregasi Master
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/laporan/penjualan/realisasi-penawaran", { params }),
};
