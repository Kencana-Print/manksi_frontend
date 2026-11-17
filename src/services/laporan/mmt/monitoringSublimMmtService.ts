import api from "@/services/api";

export interface MonitoringSublimMmtRow {
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
  JML_SUBLIM_TOTAL?: number;
  KURANG_SUBLIM?: number;
  MTR_SUBLIM_TOTAL?: number;
  [key: string]: any;
}

export const monitoringSublimMmtService = {
  async getReport(params: { startDate: string; endDate: string }) {
    const res = await api.get("/mmt/laporan/monitoring-sublim/sublim-monitoring", {
      params,
    });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
};
