import api from "@/services/api";

export interface MonitoringCetakMmtRow {
  perush?: string;
  PERUSH?: string;
  spk_perush_kode?: string;
  tglLhk?: string;
  TANGGAL_LHK?: string;
  tglSpk?: string;
  TGL_SPK?: string;
  spk_tanggal?: string;
  deadline?: string;
  DEADLINE?: string;
  spk_dateline?: string;
  namaOrder?: string;
  NAMA_ORDER?: string;
  spk_nama?: string;
  panjang?: number;
  PANJANG?: number;
  lebar?: number;
  LEBAR?: number;
  noSpk?: string;
  NO_SPK?: string;
  pcs?: number;
  ORDER_SPK_PCS?: number;
  order_meter?: number;
  ORDER_SPK_METER?: number;
  jenis?: string;
  mt01?: number;
  PCS_MT01?: number;
  mt02?: number;
  PCS_MT02?: number;
  mt03?: number;
  PCS_MT03?: number;
  mt04?: number;
  PCS_MT04?: number;
  mt05?: number;
  PCS_MT05?: number;
  cetak_luar?: number;
  CETAK_LUAR?: number;
  total_qty?: number;
  JUMLAH_PCS?: number;
  jmt01?: number;
  METER_MT01?: number;
  jmt02?: number;
  METER_MT02?: number;
  jmt03?: number;
  METER_MT03?: number;
  jmt04?: number;
  METER_MT04?: number;
  jmt05?: number;
  METER_MT05?: number;
  total_meter?: number;
  JUMLAH_METER?: number;
  jmlkurang?: number;
  KURANG_VARIANT?: number;
}

export const monitoringCetakMmtService = {
  getReport(params: { startDate: string; endDate: string }) {
    return api.get<MonitoringCetakMmtRow[]>("/mmt/laporan/monitoring-cetak/monitoring", {
      params,
    });
  },
};
