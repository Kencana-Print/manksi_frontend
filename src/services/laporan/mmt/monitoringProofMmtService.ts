import api from "@/services/api";

export interface MonitoringProofMmtRow {
  mspk_nomor?: string;
  mspk_tanggal?: string;
  mspk_dateline?: string;
  nama_order?: string;
  mspk_panjang?: number;
  mspk_lebar?: number;
  jml_order?: number;
  rencana_order?: number;
  keterangan?: string;
  lokasi_proof?: string;
  mesin_proof?: string;
  jenis_bahan?: string;
  lprd_jproof?: number;
  lpr_tanggal?: string;
  jenis?: string;
  lama_proof?: number;
  nomorspk?: string;
  spktanggal?: string;
  statusmemo?: string;
  [key: string]: any;
}

export const monitoringProofMmtService = {
  async getReport(params: { startDate: string; endDate: string }) {
    const res = await api.get("/mmt/laporan/monitoring-proof/monitoring", {
      params,
    });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },
};
