import api from "@/services/api";

export interface KekuranganProduksiRow {
  Nomor: string;
  Tanggal: string | null;
  Deadline: string | null;
  Nama: string;
  Panjang: number;
  Lebar: number;
  Jml_Order: number;
  Kurang_Cetak: number;
  Kurang_Jahit: number;
  Kurang_Lipat: number;
  Kurang_Cetak_M: number;
  Kurang_Jahit_M: number;
  Kurang_Lipat_M: number;
}

export const kekuranganProduksiService = {
  getBrowse: (params: {
    tglAwal: string;
    tglAkhir: string;
    perusahaan?: string;
  }) =>
    api.get<{ success: boolean; data: KekuranganProduksiRow[] }>(
      "/laporan/spanduk/kekurangan-produksi",
      { params },
    ),
};
