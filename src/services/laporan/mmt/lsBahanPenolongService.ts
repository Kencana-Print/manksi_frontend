import api from "@/services/api";

export interface LsBahanPenolongRow {
  kode: string;
  Nama: string;
  brg_jenis?: string;
  jb_nama?: string;
  Spesifikasi?: string;
  status?: string;
  Satuan?: string;
  Panjang?: number;
  Lebar?: number;
  m2?: number;
  stok_awal_q?: number;
  stok_awal_m?: number;
  terima_q?: number;
  terima_m?: number;
  keluar_q?: number;
  keluar_m?: number;
  retur_q?: number;
  retur_m?: number;
  stok_akhir_q?: number;
  stok_akhir_m?: number;
}

export const lsBahanPenolongService = {
  getReport(params: { startDate: string; endDate: string }) {
    return api.get<LsBahanPenolongRow[]>("/mmt/laporan-ls-bahan-penolong", { params });
  },
};
