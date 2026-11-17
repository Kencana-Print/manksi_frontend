import api from "@/services/api";

export interface LsBahanUtamaRow {
  kode: string;
  Nama: string;
  jb_nama?: string;
  status_barang?: string;
  type_barang?: string;
  Panjang?: number;
  Lebar?: number;
  m2?: number;
  stok_awal_q?: number;
  stok_awal_m?: number;
  stok_awal_nominal?: number;
  terima_q?: number;
  terima_m?: number;
  terima_nominal?: number;
  retur_q?: number;
  retur_m?: number;
  retur_nominal?: number;
  keluar_q?: number;
  keluar_m?: number;
  keluar_nominal?: number;
  stok_akhir_q?: number;
  stok_akhir_m?: number;
  stok_akhir_nominal?: number;
  keterangan?: string;
}

export interface LsBahanUtamaDetailRow {
  barcode: string;
  panjang: number;
  lebar: number;
  m2: number;
  kondisi?: string;
}

export interface GudangItem {
  kode: string;
  nama: string;
}

export const lsBahanUtamaService = {
  getReport(params: { startDate: string; endDate: string; gdgKode?: string }) {
    return api.get<LsBahanUtamaRow[]>("/mmt/laporan-ls-bahan-utama", { params });
  },
  getReportDetail(params: { startDate: string; endDate: string; gdgKode: string; brgKode: string }) {
    return api.get<{ success: boolean; data: LsBahanUtamaDetailRow[] }>("/mmt/laporan-ls-bahan-utama/detail", { params });
  },
  getGudangList() {
    return api.get<GudangItem[]>("/mmt/laporan-ls-bahan-utama/list-gudang");
  },
  getTotalRoll() {
    return api.get<{ total_roll: number }>("/mmt/laporan-ls-bahan-utama/total-roll");
  },
  getFlow6Bulan() {
    return api.get<any[]>("/mmt/laporan-ls-bahan-utama/flow-6-bulan");
  },
};
