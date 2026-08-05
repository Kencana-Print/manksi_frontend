import api from "@/services/api";

export const koreksiStokBarangService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    cabang: string,
    jenis: string,
  ) =>
    api.get("/garmen/barang/koreksi-stok/browse", {
      params: { startDate, endDate, cabang, jenis },
    }),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/barang/koreksi-stok/${encodeURIComponent(nomor)}`),

  ajukanPerubahan: (payload: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) => api.post("/garmen/barang/koreksi-stok/pengajuan", payload),
};
