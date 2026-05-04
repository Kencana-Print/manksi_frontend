import api from "@/services/api";

export const returBahanService = {
  getBrowse(params: { startDate: string; endDate: string }) {
    return api.get("/garmen/bahan-baku/retur-bahan", { params });
  },

  deleteData(nomor: string) {
    return api.delete(
      `/garmen/bahan-baku/retur-bahan/${encodeURIComponent(nomor)}`,
    );
  },

  requestEdit(payload: {
    nomor: string;
    tanggal: string;
    keterangan: string;
    alasan: string;
  }) {
    return api.post("/garmen/bahan-baku/retur-bahan/request-edit", payload);
  },
};
