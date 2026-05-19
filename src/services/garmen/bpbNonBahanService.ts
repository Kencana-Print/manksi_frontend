import api from "@/services/api";

export const bpbNonBahanService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    jenis: string;
    cabang: string;
  }) => api.get("/garmen/barang/bpb-nonbahan", { params }),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/barang/bpb-nonbahan/${encodeURIComponent(nomor)}`),

  requestPin: (payload: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) => api.post("/garmen/barang/bpb-nonbahan/pin", payload),
};
