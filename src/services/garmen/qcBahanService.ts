import api from "@/services/api";

export interface QcBahanBrowseParams {
  startDate: string;
  endDate: string;
  status: string;
}

export interface QcLanjutGudang {
  lot: string;
  alasan: string;
}

export const qcBahanService = {
  // Ambil data header (Master)
  getBrowse: (params: QcBahanBrowseParams) =>
    api.get("/garmen/bahan-baku/qc-bahan", { params }),

  // Ambil data detail (saat baris di-expand)
  getDetail: (nomor: string) =>
    api.get(`/garmen/bahan-baku/qc-bahan/detail/${encodeURIComponent(nomor)}`),

  // Semua lot pada rentang tanggal (Export Detail)
  getAllDetail: (params: QcBahanBrowseParams) =>
    api.get("/garmen/bahan-baku/qc-bahan/all-detail", { params }),

  // Hapus data (hanya DRAFT, dicek di backend)
  delete: (nomor: string) =>
    api.delete(
      `/garmen/bahan-baku/qc-bahan/delete/${encodeURIComponent(nomor)}`,
    ),

  // Pengajuan PIN Perubahan Data
  requestPin: (payload: { nomor: string; alasan: string }) =>
    api.post("/garmen/bahan-baku/qc-bahan/request-pin", payload),

  submit: (nomor: string, lanjut: QcLanjutGudang[] = []) =>
    api.post(
      `/garmen/bahan-baku/qc-bahan/submit/${encodeURIComponent(nomor)}`,
      { lanjut },
    ),
};
