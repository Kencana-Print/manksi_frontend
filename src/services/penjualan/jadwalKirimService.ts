import api from "@/services/api";

export const jadwalKirimService = {
  getBrowse: (params: { tglAwal: string; tglAkhir: string; gudang?: string }) =>
    api.get("/penjualan/jadwal-kirim", { params }),

  getDetail: (nomor: string) =>
    api.get(`/penjualan/jadwal-kirim/${encodeURIComponent(nomor)}/detail`),

  // Fetch semua detail sesuai filter — dipakai untuk export detail di frontend
  getDetailByFilter: (params: {
    tglAwal: string;
    tglAkhir: string;
    gudang?: string;
  }) => api.get("/penjualan/jadwal-kirim/detail-by-filter", { params }),

  getCetak: (params: { tglAwal: string; tglAkhir: string; gudang?: string }) =>
    api.get("/penjualan/jadwal-kirim/cetak", { params }),

  getListGudang: (divisi?: number) =>
    api.get("/penjualan/jadwal-kirim/lookup/gudang", {
      params: divisi ? { divisi } : undefined,
    }),

  tundaData: (nomor: string, alasan: string) =>
    api.post(`/penjualan/jadwal-kirim/${encodeURIComponent(nomor)}/tunda`, {
      alasan,
    }),

  deleteData: (nomor: string) =>
    api.delete(`/penjualan/jadwal-kirim/${encodeURIComponent(nomor)}`),
};
