import api from "@/services/api";

export const permintaanPembelianFormService = {
  getDetail(nomor: string) {
    return api.get(`/garmen/barang/permintaan-pembelian/form/${nomor}`);
  },
  saveData(payload: any) {
    return api.post("/garmen/barang/permintaan-pembelian/form", payload);
  },
  saveRealisasi(payload: { nomor: string; kode: string; items: any[] }) {
    return api.post(
      "/garmen/barang/permintaan-pembelian/form/save-realisasi",
      payload,
    );
  },
};
