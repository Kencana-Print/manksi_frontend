import api from "@/services/api";

export interface LaporanPersediaanGudang {
  kode: string;
  nama: string;
}

export interface LaporanPersediaanRow {
  kategori: string;
  divisi: string;
  kode: string;
  nama: string;
  konstruksi: string;
  lebar: number;
  panjang: number;
  satuan: string;
  supplier_kode: string;
  supplier_nama: string;
  stok: Record<string, number>;
  jumlah: number;
}

export interface LaporanPersediaanData {
  tanggal: string;
  gudang: LaporanPersediaanGudang[];
  rows: LaporanPersediaanRow[];
  total: { jumlah: number; stok: Record<string, number> };
}

export interface LaporanPersediaanParams {
  tanggal: string;
  sembunyiNol?: boolean;
}

export const laporanPersediaanService = {
  getBrowse: (params: LaporanPersediaanParams) =>
    api.get<{ success: boolean; data: LaporanPersediaanData }>(
      "/laporan/spanduk/laporan-persediaan",
      {
        params: {
          tanggal: params.tanggal,
          sembunyiNol: params.sembunyiNol ? 1 : 0,
        },
      },
    ),
};
