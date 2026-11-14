import api from "@/services/api";

export interface KartuStokKainRow {
  kode: string;
  nama: string;
  divisi: string;
  kategori: string;
  konstruksi: string;
  panjang: number;
  lebar: number;
  satuan: string;
  stock_awal: number;
  jml_in: number;
  jml_out: number;
  stock_akhir: number;
}

export interface KartuStokKainDetailRow {
  kode: string;
  nama: string;
  kategori: string;
  konstruksi: string;
  panjang: number;
  lebar: number;
  nomor_ref: string;
  tanggal: string;
  keterangan: string;
  gudang: string;
  jml_in: number;
  jml_out: number;
  satuan: string;
}

export interface KartuStokKainGudang {
  kode: string;
  nama: string;
}

export interface KartuStokKainParams {
  tglAwal: string;
  tglAkhir: string;
  gudang?: string;
}

const URL = "/laporan/spanduk/kartu-stok-kain";

export const kartuStokKainService = {
  getBrowse: (p: KartuStokKainParams) =>
    api.get<{ success: boolean; data: KartuStokKainRow[] }>(URL, {
      params: { ...p, gudang: p.gudang || undefined },
    }),

  // kode kosong = detail semua bahan (untuk Export Detail)
  getDetail: (p: KartuStokKainParams & { kode?: string }) =>
    api.get<{ success: boolean; data: KartuStokKainDetailRow[] }>(
      `${URL}/detail`,
      {
        params: {
          ...p,
          gudang: p.gudang || undefined,
          kode: p.kode || undefined,
        },
      },
    ),

  getGudang: () =>
    api.get<{ success: boolean; data: KartuStokKainGudang[] }>(`${URL}/gudang`),
};
