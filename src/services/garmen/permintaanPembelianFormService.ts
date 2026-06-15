import api from "@/services/api";

export const permintaanPembelianFormService = {
  getDetail(nomor: string) {
    return api.get(`/garmen/barang/permintaan-pembelian/form/${nomor}`);
  },
  getBarangByKode: (
    kode: string,
    jenis: string,
    cabang: string,
    bagian: string,
  ) =>
    api.get(
      `/garmen/barang/permintaan-pembelian/barang/${encodeURIComponent(kode)}`,
      { params: { jenis, cabang, bagian } },
    ),
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
