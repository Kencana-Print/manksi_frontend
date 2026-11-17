import api from "@/services/api";

export interface LaporanSpkMmtRow {
  NOMOR: string;
  spk_memo?: string;
  spk_nama: string;
  spk_tanggal?: string;
  deadline?: string;
  DIVISI?: string;
  jo_nama?: string;
  spk_gramasi?: string;
  status?: string;
  PANJANG?: number;
  LEBAR?: number;
  KAIN?: string;
  FINISHING?: string;
  spk_jumlah?: number;
  mt01?: number;
  mt02?: number;
  mt03?: number;
  mt04?: number;
  mt05?: number;
  mi?: number;
  JML_CETAK?: number;
  JML_seaming?: number;
  JML_mataayam?: number;
  JML_coly?: number;
  JML_JADI?: number;
  JML_KIRIM?: number;
  JML_meter_KIRIM?: number;
  mt01_m?: number;
  mt02_m?: number;
  mt03_m?: number;
  mt04_m?: number;
  mt05_m?: number;
  mi_m?: number;
  M_CETAK?: number;
  m_seaming?: number;
  m_mataayam?: number;
  m_coly?: number;
}

export const laporanSpkMmtService = {
  getReport(params: { startDate: string; endDate: string }) {
    return api.get<{ data: LaporanSpkMmtRow[] } | LaporanSpkMmtRow[]>("/mmt/laporan-spk-mmt", { params });
  },
};
