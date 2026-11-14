import api from "@/services/api";

export const DAFTAR_JENIS_PENOLONG = [
  "ACCESORIES",
  "OBAT",
  "SPAREPART",
  "ATK/RTK",
  "ASET",
] as const;

export type JenisPenolong = (typeof DAFTAR_JENIS_PENOLONG)[number];

export interface KartuStokPenolongRow {
  kode: string;
  nama: string;
  kategori: string;
  spesifikasi: string;
  satuan: string;
  stock_awal: number;
  jml_in: number;
  jml_out: number;
  stock_akhir: number;
}

export interface KartuStokPenolongDetailRow {
  kode: string;
  nama: string;
  kategori: string;
  spesifikasi: string;
  satuan: string;
  nomor_ref: string;
  tanggal: string;
  keterangan: string;
  jml_in: number;
  jml_out: number;
}

export interface KartuStokPenolongCabang {
  kode: string;
}

export interface KartuStokPenolongParams {
  jenis: JenisPenolong;
  tglAwal: string;
  tglAkhir: string;
  cabang?: string;
}

const URL = "/laporan/spanduk/kartu-stok-bahan-penolong";

export const kartuStokBahanPenolongService = {
  getBrowse: (p: KartuStokPenolongParams) =>
    api.get<{ success: boolean; data: KartuStokPenolongRow[] }>(URL, {
      params: { ...p, cabang: p.cabang || undefined },
    }),

  // kode kosong = detail semua bahan (untuk Export Detail)
  getDetail: (p: KartuStokPenolongParams & { kode?: string }) =>
    api.get<{ success: boolean; data: KartuStokPenolongDetailRow[] }>(
      `${URL}/detail`,
      {
        params: {
          ...p,
          cabang: p.cabang || undefined,
          kode: p.kode || undefined,
        },
      },
    ),

  getCabang: (jenis: JenisPenolong) =>
    api.get<{ success: boolean; data: KartuStokPenolongCabang[] }>(
      `${URL}/cabang`,
      { params: { jenis } },
    ),
};
