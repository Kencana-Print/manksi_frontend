import api from "@/services/api";

export interface LmkpSizeDetail {
  size_name: string;
  size_qty: number;
  size_krg_cetak: number;
  components?: Array<{
    komponen: string;
    qty_order: number;
    qty_cetak: number;
    kurang_cetak: number;
    qty_mutasi?: number;
    kurang_mutasi?: number;
  }>;
}

export interface MonitoringLmkpMmtRow {
  NOMOR: string;
  spk_memo?: string;
  spk_tanggal?: string;
  deadline?: string;
  spk_nama?: string;
  spk_statuskerja?: string;
  spk_workshop?: string;
  DIVISI?: string;
  jo_nama?: string;
  status?: string;
  PANJANG?: number;
  LEBAR?: number;
  KAIN?: string;
  spk_gramasi?: string;
  FINISHING?: string;
  spk_jumlah?: number;
  spk_jumlah_kirim?: number;
  krg_kirim?: number;
  krg_Seaming?: number;
  krg_mataayam?: number;
  krg_coly?: number;
  krg_Cetak?: number;
  krg_mutasi_p04?: number;
  krg_kirim_meter?: number;
  krg_Cetak_meter?: number;
  krg_coly_meter?: number;
  mt01?: number;
  mt02?: number;
  mt03?: number;
  mt04?: number;
  mt05?: number;
  mi?: number;
  mx01?: number;
  mx02?: number;
  mx03?: number;
  mx04?: number;
  mx05?: number;
  sb01?: number;
  sb02?: number;
  sb03?: number;
  sb04?: number;
  sb05?: number;
  rtr?: number;
  cetak_luarx?: number;
  sizes?: LmkpSizeDetail[];
  [key: string]: any;
}

export type LaporanLmkpMmtRow = MonitoringLmkpMmtRow;

export interface LmkpSummary {
  outputPerHari: number;
  totalWaitingList: number;
  estimasiSelesaiHari: number | string;
}

export const monitoringLmkpMmtService = {
  async getReport(params: {
    jenisIndex: string | number;
    startDate: string;
    endDate: string;
  }) {
    const res = await api.get<{
      status: string;
      summary: LmkpSummary;
      data: MonitoringLmkpMmtRow[];
    }>("/mmt/laporan/lmkp-mmt/lmkp", { params });
    return {
      summary: res.data?.summary || {
        outputPerHari: 0,
        totalWaitingList: 0,
        estimasiSelesaiHari: 0,
      },
      data: res.data?.data || [],
    };
  },
};

export const laporanLmkpMmtService = monitoringLmkpMmtService;
