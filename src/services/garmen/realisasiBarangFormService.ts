import api from "@/services/api";

export const realisasiBarangFormService = {
  // Menarik data permintaan (stok live, qty minta, qty sudah realisasi)
  getPermintaanDetail: (nomorMinta: string) =>
    api.get(
      `/garmen/barang/realisasi/form/referensi-permintaan/${encodeURIComponent(
        nomorMinta,
      )}`,
    ),

  // Menarik data realisasi yang sudah tersimpan (untuk Edit)
  getDetail: (nomor: string) =>
    api.get(`/garmen/barang/realisasi/form/${encodeURIComponent(nomor)}`),

  getPrint: (nomor: string) =>
    api.get(`/garmen/barang/realisasi/form/print/${encodeURIComponent(nomor)}`),

  // Menyimpan data (Create / Update)
  saveData: (payload: any) => {
    if (payload.nomor) {
      return api.put("/garmen/barang/realisasi/form", payload);
    }
    return api.post("/garmen/barang/realisasi/form", payload);
  },
};
