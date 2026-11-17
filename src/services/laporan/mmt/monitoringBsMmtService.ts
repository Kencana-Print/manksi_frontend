import api from "@/services/api";

export interface MonitoringBsMmtRow {
  Modul?: string;
  Nomor_LHK?: string;
  Tanggal?: string;
  Operator?: string;
  Mesin?: string;
  Brg_Kode?: string;
  Brg_Nama?: string;
  Barcode?: string;
  Panjang_BS?: number;
  Lebar_BS?: number;
  Jumlah_BS?: number;
  Luas_BS_M2?: number;
  Status?: string;
  [key: string]: any;
}

export interface MonitoringBsMmtSummary {
  total_records: number;
  total_pcs: number;
  total_m2: number;
  breakdown: {
    cetak_mmt: { pcs: number; m2: number };
    tekstil: { pcs: number; m2: number };
    finishing: { pcs: number; m2: number };
    paperprint: { pcs: number; m2: number };
    sublim: { pcs: number; m2: number };
  };
}

export const monitoringBsMmtService = {
  async getReport(params: {
    startDate: string;
    endDate: string;
    type?: string;
    gdgKode?: string;
    search?: string;
  }) {
    const res = await api.get<{
      success: boolean;
      summary: MonitoringBsMmtSummary;
      data: MonitoringBsMmtRow[];
    }>("/mmt/laporan/monitoring-bs", { params });
    return {
      summary: res.data.summary,
      data: res.data.data || [],
    };
  },
};
