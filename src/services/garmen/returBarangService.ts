import api from "@/services/api";

export const returBarangService = {
  // Ambil data untuk tabel browse dengan filter lengkap
  getBrowse: (
    startDate: string,
    endDate: string,
    cabang: string,
    jenis: string,
  ) =>
    api.get("/garmen/barang/retur-barang/browse", {
      params: { startDate, endDate, cabang, jenis },
    }),

  // Hapus data (validasi tabel/approve/tutup-buku ada di backend)
  deleteData: (nomor: string) =>
    api.delete(`/garmen/barang/retur-barang/${encodeURIComponent(nomor)}`),

  // Pengajuan revisi data jika periode sudah tutup (PIN 5)
  ajukanPerubahan: (payload: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) => api.post("/garmen/barang/retur-barang/pengajuan", payload),
};
