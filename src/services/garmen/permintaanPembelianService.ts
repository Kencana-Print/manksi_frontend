import api from "@/services/api";

export const permintaanPembelianService = {
  getBrowse(params: any) {
    return api.get("/garmen/barang/permintaan-pembelian", { params });
  },
  getDetail(nomor: string, jenis: string) {
    return api.get(`/garmen/barang/permintaan-pembelian/${nomor}/detail`, {
      params: { jenis },
    });
  },
  delete(nomor: string) {
    return api.delete(`/garmen/barang/permintaan-pembelian/${nomor}`);
  },
  close(nomor: string) {
    return api.post(`/garmen/barang/permintaan-pembelian/${nomor}/close`);
  },
  requestPin(payload: { nomor: string; alasan: string }) {
    return api.post("/garmen/barang/permintaan-pembelian/request-pin", payload);
  },
  updateEstimasi(nomor: string, tanggal: string) {
    return api.post(`/garmen/barang/permintaan-pembelian/${nomor}/estimasi`, {
      tanggal,
    });
  },
};
