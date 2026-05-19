import api from "@/services/api";

export const poNonBahanService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    jenis?: string;
    cabang?: string;
  }) => api.get("/garmen/barang/po-nonbahan", { params }),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/barang/po-nonbahan/${encodeURIComponent(nomor)}`),

  requestPin: (payload: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) => api.post("/garmen/barang/po-nonbahan/pin", payload),
};
