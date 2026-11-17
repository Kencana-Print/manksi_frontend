import api from "@/services/api";

export interface JadwalKirimDetailRow {
  Nomor: string;
  No_urut: number;
  Kota?: string;
  Uraian?: string;
  Size?: string;
  Jumlah?: number;
  Koli?: number;
  "Jam Input"?: string;
  "Jam Brg Ready"?: string;
  "Nomor SJ"?: string;
  "Realisasi Kirim"?: number;
  Jam_Kirim?: string;
  Jam_Ambil?: string;
  Expedisi?: string;
  [key: string]: any;
}

export interface MonitoringJadwalKirimMmtRow {
  Nomor: string;
  Gudang?: string;
  Nama_Gudang?: string;
  Tanggal?: string;
  No_SPK?: string;
  Nama_Spk?: string;
  Panjang?: number;
  Lebar?: number;
  Kain?: string;
  Jumlah?: number;
  Jumlah_Meter?: number;
  Koli?: number;
  Realisasi?: number;
  Koli_Realisasi?: number;
  Selisih_Jumlah?: number;
  Selisih_Koli?: number;
  JmlCetakLuar?: number;
  Sup?: string;
  sup_nama?: string;
  usr_create?: string;
  details?: JadwalKirimDetailRow[];
  [key: string]: any;
}

export const monitoringJadwalKirimMmtService = {
  async getReport(params: { startDate: string; endDate: string }) {
    const res = await api.get<{
      status: boolean;
      data: MonitoringJadwalKirimMmtRow[];
    }>("/mmt/laporan/monitoring-jadwal-kirim/laporan", { params });
    return Array.isArray(res.data) ? res.data : res.data?.data || [];
  },

  deleteJadwalKirim(nomorKirim: string) {
    return api.delete(`/mmt/laporan/monitoring-jadwal-kirim/${encodeURIComponent(nomorKirim)}`);
  },
};
