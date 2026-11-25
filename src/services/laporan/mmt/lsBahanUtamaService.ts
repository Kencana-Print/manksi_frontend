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
  tanggal?: string;
  no_referensi?: string;
  no_spk?: string;
  kategori?: string;
  barcode?: string;
  jenis_mutasi?: string;
  qty_in?: number;
  qty_out?: number;
  meter_in?: number;
  meter_out?: number;
}

export interface GudangItem {
  kode: string;
  nama: string;
  aktif?: boolean | number | string;
}

const BASE = "/mmt/laporan/ls-bahan-utama";

export const lsBahanUtamaService = {
  getReport(params: {
    startDate: string;
    endDate: string;
    gdgKode?: string;
    [key: string]: any;
  }) {
    return api.get<any>(BASE, {
      params: {
        startDate: params.startDate,
        endDate: params.endDate,
        gdgKode: params.gdgKode || "WH-16",
      },
    });
  },

  getReportDetail(params: {
    startDate: string;
    endDate: string;
    gdgKode: string;
    brgKode: string;
  }) {
    return api.get<{ success: boolean; data: LsBahanUtamaDetailRow[] }>(
      `${BASE}/detail`,
      { params },
    );
  },

  getGudangList() {
    return api.get<any>(`${BASE}/list-gudang`);
  },

  getTotalRoll() {
    return api.get<{ success: boolean; data: { total_roll: number; total_jenis_barang: number; total_incoming: number; total_outgoing: number } }>(
      `${BASE}/total-roll`,
    );
  },

  getFlow6Bulan() {
    return api.get<any>(`${BASE}/flow-6-bulan`);
  },
};
