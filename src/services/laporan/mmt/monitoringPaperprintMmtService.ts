import api from "@/services/api";

export interface MonitoringPaperprintMmtRow {
  PERUSH?: string;
  NO_SPK?: string;
  NAMA_ORDER?: string;
  ORDER_SPK_PCS?: number;
  PANJANG?: number;
  LEBAR?: number;
  TGL_SPK?: string;
  DEADLINE?: string;
  NO_LHK?: string;
  TANGGAL_LHK?: string;
  ORDER_METER?: number;
  JML_CETAK_TOTAL?: number;
  KURANG_CETAK?: number;
  MTR_CETAK_TOTAL?: number;
  CETAK_LUAR_PCS?: number;
  CETAK_LUAR_MTR?: number;
  [key: string]: any;
}

export const monitoringPaperprintMmtService = {
  async getReport(params: { startDate: string; endDate: string }) {
    const res = await api.get("/mmt/laporan/monitoring-paperprint/monitoring", {
      params,
    });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
};
