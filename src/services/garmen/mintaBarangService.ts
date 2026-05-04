import api from "@/services/api";

export const mintaBarangService = {
  getBrowse(startDate: string, endDate: string, cabang: string, jenis: string) {
    return api.get("/garmen/barang/permintaan", {
      params: { startDate, endDate, cabang, jenis },
    });
  },

  checkInsert() {
    return api.get("/garmen/barang/permintaan/check-block");
  },

  deleteData(nomor: string) {
    return api.delete(`/garmen/barang/permintaan/${encodeURIComponent(nomor)}`);
  },

  setClose(nomor: string, payload: { alasan: string }) {
    return api.post("/garmen/barang/permintaan/close", { nomor, ...payload });
  },

  ajukanPerubahan(
    nomor: string,
    payload: { alasan: string; tgl: string; spk: string; urut: number },
  ) {
    return api.post("/garmen/barang/permintaan/request-edit", {
      nomor,
      ...payload,
    });
  },

  // Endpoint opsional jika Anda mengimplementasikan F7 (Approve Realisasi) di backend nanti
  approveRealisasi(nomorRealisasi: string) {
    return api.post(`/garmen/barang/permintaan/approve-realisasi`, {
      nomor: nomorRealisasi,
    });
  },
};
