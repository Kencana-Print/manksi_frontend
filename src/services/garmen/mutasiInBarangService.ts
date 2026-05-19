import api from "@/services/api";

export const mutasiInBarangService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    jenis?: string;
    cabang?: string;
  }) => api.get("/garmen/barang/mutasi-in", { params }),

  terimaMutasi: (nomor: string) =>
    api.post(`/garmen/barang/mutasi-in/terima/${encodeURIComponent(nomor)}`),
};
