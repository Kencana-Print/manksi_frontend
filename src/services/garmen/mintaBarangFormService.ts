import api from "@/services/api";

export const mintaBarangFormService = {
  getDetail(nomor: string) {
    return api.get(
      `/garmen/barang/permintaan/form/${encodeURIComponent(nomor)}`,
    );
  },

  saveData(payload: any) {
    return api.post("/garmen/barang/permintaan/form", payload);
  },
};
