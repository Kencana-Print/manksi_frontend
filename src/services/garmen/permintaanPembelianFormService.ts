import api from "@/services/api";

export const permintaanPembelianFormService = {
  getDetail(nomor: string) {
    return api.get(`/garmen/barang/permintaan-pembelian/form/${nomor}`);
  },
  uploadGambarItem: (nomor: string, kode: string, formData: FormData) =>
    api.post(
      `/garmen/permintaan-pembelian/gambar/${encodeURIComponent(nomor)}/${encodeURIComponent(kode)}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    ),
  deleteGambarItem: (nomor: string, kode: string) =>
    api.delete(
      `/garmen/permintaan-pembelian/gambar/${encodeURIComponent(nomor)}/${encodeURIComponent(kode)}`,
    ),
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
