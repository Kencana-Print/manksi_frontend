import api from "@/services/api";

export interface MonitoringFinishingMmtRow {
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
  jmlseaming?: number;
  jmlmataayam?: number;
  jmlcoly?: number;
  cetak_luar?: number;
  jmlkurang?: number;
  Jml_seaming?: number;
  Jml_mataayam?: number;
  Jml_coly?: number;
  sisa_seaming?: number;
  sisa_mataayam?: number;
  sisa_coly?: number;
  Tanggal_LHK?: string;
  [key: string]: any;
}

export const monitoringFinishingMmtService = {
  async getReport(params: { startDate: string; endDate: string }) {
    const res = await api.get<MonitoringFinishingMmtRow[]>(
      "/mmt/laporan/monitoring-finishing",
      { params },
    );
    return Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
  },
};
