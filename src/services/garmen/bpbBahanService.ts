import api from "@/services/api";

export const bpbBahanService = {
  // Ambil data header (Master)
  getBrowse: (params: any) =>
    api.get("/garmen/bahan-baku/bpb-bahan", { params }),

  // Ambil data detail (saat baris di-expand)
  getDetail: (nomor: string) =>
    api.get(`/garmen/bahan-baku/bpb-bahan/detail/${encodeURIComponent(nomor)}`),

  // Hapus data
  delete: (nomor: string) =>
    api.delete(
      `/garmen/bahan-baku/bpb-bahan/delete/${encodeURIComponent(nomor)}`,
    ),

  // Pengajuan PIN Perubahan Data
  requestPin: (payload: { nomor: string; alasan: string }) =>
    api.post("/garmen/bahan-baku/bpb-bahan/request-pin", payload),
};
