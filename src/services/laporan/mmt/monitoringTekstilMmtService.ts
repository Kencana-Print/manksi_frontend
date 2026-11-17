import api from "@/services/api";

export interface MonitoringTekstilMmtRow {
  spk_perush_kode?: string;
  spk_tanggal?: string;
  spk_dateline?: string;
  spk_nomor?: string;
  spk_nama?: string;
  spk_panjang?: number;
  spk_lebar?: number;
  spk_jumlah?: number;
  spk_kain?: string;
  order_meter?: number;
  jmlcetak?: number;
  jmlkurang?: number;
  mx01?: number;
  mx02?: number;
  mx03?: number;
  jmx01?: number;
  jmx02?: number;
  jmx03?: number;
  cetak_meter?: number;
  Tanggal_LHK?: string;
}

export const monitoringTekstilMmtService = {
  getReport(params: { startDate: string; endDate: string }) {
    return api.get<MonitoringTekstilMmtRow[]>("/mmt/laporan/monitoring-tekstil", {
      params,
    });
  },
};
