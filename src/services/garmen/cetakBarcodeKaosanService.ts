import api from "@/services/api";

const BASE = "/garmen/bahan-jadi/cetak-barcode-kaosan";

export const cetakBarcodeKaosanService = {
  getBrowse: (tglAwal: string, tglAkhir: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir } }),

  getDetail: (nomor: string) =>
    api.get(`${BASE}/${encodeURIComponent(nomor)}/detail`),

  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),
};
