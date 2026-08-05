import api from "@/services/api";

export const returPembelianBarangService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    cabang: string,
    jenis: string,
  ) =>
    api.get("/garmen/barang/retur-pembelian/browse", {
      params: { startDate, endDate, cabang, jenis },
    }),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/barang/retur-pembelian/${encodeURIComponent(nomor)}`),

  ajukanPerubahan: (payload: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) => api.post("/garmen/barang/retur-pembelian/pengajuan", payload),
};
