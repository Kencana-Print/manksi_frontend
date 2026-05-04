import api from "@/services/api";

export const mintaBahanFormService = {
  getKomponen: () => api.get("/garmen/bahan-baku/minta-bahan/options/komponen"),

  getSpkInfo: (spk: string, cabang: string, keterangan: string) =>
    api.get(
      `/garmen/bahan-baku/minta-bahan/spk-info/${encodeURIComponent(spk)}`,
      {
        params: { cabang, keterangan },
      },
    ),

  getDetail: (nomor: string) =>
    api.get(`/garmen/bahan-baku/minta-bahan/form/${encodeURIComponent(nomor)}`),

  saveData: (payload: any, nomor?: string) => {
    if (nomor) {
      return api.put(
        `/garmen/bahan-baku/minta-bahan/form/${encodeURIComponent(nomor)}`,
        payload,
      );
    }
    // PERBAIKAN: Tambahkan /form di ujungnya
    return api.post("/garmen/bahan-baku/minta-bahan/form", payload);
  },

  getPrintData: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/minta-bahan/print/${encodeURIComponent(nomor)}`,
    ),
};
