import api from "@/services/api";

export const laporanStokBahanBarcodeService = {
  getBrowse: (params: { endDate: string; tampilkanKosong: boolean }) =>
    api.get("/laporan/gudang-garmen/stok-bahan-barcode", { params }),

  getBrowseDetail: (
    kode: string,
    params: { endDate: string; janganTampilkanKosongDetail: boolean },
  ) =>
    api.get(
      `/laporan/gudang-garmen/stok-bahan-barcode/detail/${encodeURIComponent(kode)}`,
      { params },
    ),

  getKeteranganList: (kode: string) =>
    api.get(
      `/laporan/gudang-garmen/stok-bahan-barcode/keterangan/${encodeURIComponent(kode)}`,
    ),

  updateKeteranganList: (items: any[]) =>
    api.put("/laporan/gudang-garmen/stok-bahan-barcode/keterangan", { items }),

  getMkbBelumRealisasiDetail: (kode: string) =>
    api.get(
      `/laporan/gudang-garmen/stok-bahan-barcode/${encodeURIComponent(kode)}/mkb-belum-realisasi`,
    ),
};
