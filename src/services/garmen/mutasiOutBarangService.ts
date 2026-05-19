import api from "@/services/api";

export const mutasiOutBarangService = {
  // Ambil data header Mutasi Out
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    jenis: string;
    cabang: string;
  }) => api.get("/garmen/barang/mutasi-out", { params }),

  // Ambil data detail item Mutasi Out
  getDetail: (nomor: string) =>
    api.get(`/garmen/barang/mutasi-out/detail/${encodeURIComponent(nomor)}`),

  // Hapus data
  deleteData: (nomor: string) =>
    api.delete(`/garmen/barang/mutasi-out/${encodeURIComponent(nomor)}`),

  // Pengajuan PIN Edit
  requestPin: (payload: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) => api.post("/garmen/barang/mutasi-out/request-pin", payload),
};
