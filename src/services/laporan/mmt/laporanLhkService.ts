import api from "@/services/api";

export interface LhkRekapMesinRow {
  Mesin: string;
  Kategori: string;
  Jml_SPK: number;
  Total_Pcs: number;
  Total_Meter: number;
  Kapasitas: number;
}

export interface LhkRekapHarianRow {
  Tanggal: string;
  Mesin: string;
  Kategori: string;
  Total_Meter: number;
}

export interface LhkDetailSpkRow {
  No_SPK: string;
  Nama_Order: string;
  Total_Pcs: number;
  Total_Meter: number;
}

export const laporanLhkService = {
  getRekap(params: { startDate: string; endDate: string }) {
    return api.get<{
      success: boolean;
      data: {
        rekapMesin: LhkRekapMesinRow[];
        rekapHarian: LhkRekapHarianRow[];
      };
    }>("/mmt/laporan-lhk/rekap", { params });
  },
  getDetailMesin(params: { startDate: string; endDate: string; mesin: string }) {
    return api.get<{
      success: boolean;
      data: LhkDetailSpkRow[];
    }>("/mmt/laporan-lhk/detail-mesin", { params });
  },
  getCrossTab(params: { month: number; year: number }) {
    return api.get("/mmt/laporan-lhk/crosstab", { params });
  },
  getAllDataForExport(params: { startDate: string; endDate: string; mesin?: string }) {
    return api.get<{ success: boolean; data: any[] }>("/mmt/laporan-lhk/export", { params });
  },
};
