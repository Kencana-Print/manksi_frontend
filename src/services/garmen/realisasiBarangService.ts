import api from "@/services/api";

export const realisasiBarangService = {
  // Ambil data untuk tabel browse dengan filter lengkap
  getBrowse: (
    startDate: string,
    endDate: string,
    cabang: string,
    jenis: string,
  ) =>
    api.get("/garmen/barang/realisasi/browse", {
      params: { startDate, endDate, cabang, jenis },
    }),

  // Ambil detail satu record (untuk load di form ubah)
  getDetail: (nomor: string) =>
    api.get(`/garmen/barang/realisasi/${encodeURIComponent(nomor)}`),

  // Hapus data (logic kalkulasi status permintaan ada di backend)
  deleteData: (nomor: string) =>
    api.delete(`/garmen/barang/realisasi/${encodeURIComponent(nomor)}`),

  // Pengajuan revisi data jika periode sudah tutup (PIN 5)
  ajukanPerubahan: (payload: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) => api.post("/garmen/barang/realisasi/pengajuan", payload),
};
