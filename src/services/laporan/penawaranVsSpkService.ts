import api from "@/services/api";

export const penawaranVsSpkService = {
  // Ambil data header (Master Penawaran) beserta filternya
  getBrowse: (params: { startDate: string; endDate: string; divisi: string }) =>
    api.get("/laporan/penjualan/penawaran-vs-spk", { params }),

  // Ambil data detail (SPK terkait saat baris di-expand)
  getDetail: (nomor: string) =>
    api.get(
      `/laporan/penjualan/penawaran-vs-spk/detail/${encodeURIComponent(nomor)}`,
    ),
};
