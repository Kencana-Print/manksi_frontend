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
  aktif?: boolean | number | string;
}

export const lsBahanUtamaService = {
  async getReport(params: {
    startDate: string;
    endDate: string;
    gdgKode?: string;
    [key: string]: any;
  }) {
    const query = {
      startDate: params.startDate,
      endDate: params.endDate,
      tglAwal: params.startDate,
      tglAkhir: params.endDate,
      gdgKode: params.gdgKode || "WH-16",
      gdg_kode: params.gdgKode || "WH-16",
      ...params,
    };
    try {
      return await api.get<any>("/report/produksi-mmt/ls-bahan-utama", {
        params: query,
      });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return await api.get<any>("/mmt/laporan-ls-bahan-utama", {
          params: query,
        });
      }
      throw err;
    }
  },

  async getReportDetail(params: {
    startDate: string;
    endDate: string;
    gdgKode: string;
    brgKode: string;
  }) {
    try {
      return await api.get<{ success: boolean; data: LsBahanUtamaDetailRow[] }>(
        "/report/produksi-mmt/ls-bahan-utama/detail",
        { params },
      );
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return await api.get<{ success: boolean; data: LsBahanUtamaDetailRow[] }>(
          "/mmt/laporan-ls-bahan-utama/detail",
          { params },
        );
      }
      throw err;
    }
  },

  async getGudangList() {
    try {
      return await api.get<any>(
        "/report/produksi-mmt/ls-bahan-utama/gudang-list",
        { params: { aktif: 1 } },
      );
    } catch (err: any) {
      if (err?.response?.status === 404) {
        try {
          return await api.get<any>("/mmt/lookup/gudang", {
            params: { aktif: 1 },
          });
        } catch {
          return await api.get<any>("/mmt/laporan-ls-bahan-utama/list-gudang");
        }
      }
      throw err;
    }
  },

  getTotalRoll() {
    return api.get<{ total_roll: number }>(
      "/report/produksi-mmt/ls-bahan-utama/total-roll",
    );
  },

  getFlow6Bulan() {
    return api.get<any[]>("/report/produksi-mmt/ls-bahan-utama/flow-6-bulan");
  },
};
