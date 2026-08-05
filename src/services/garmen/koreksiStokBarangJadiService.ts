import api from "@/services/api";

// ⚠️ Tanpa param cabang/jenis — modul ini tidak punya konsep tsb sama
// sekali di source (beda dari koreksiStokBarangService / Garmen>Barang).
export const koreksiStokBarangJadiService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get("/garmen/bahan-jadi/koreksi-stok/browse", {
      params: { startDate, endDate },
    }),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/bahan-jadi/koreksi-stok/${encodeURIComponent(nomor)}`),

  getPrintData: (nomor: string) =>
    api.get(
      `/garmen/bahan-jadi/koreksi-stok/print/${encodeURIComponent(nomor)}`,
    ),
};
