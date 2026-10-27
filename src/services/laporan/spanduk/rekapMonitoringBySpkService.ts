import api from "@/services/api";

export interface RekapMonitoringBySpkRow {
  Perusahaan: string | null;
  Tgl_SPK: string | null;
  Deadline: string | null;
  Nama_SPK: string | null;
  Panjang: number;
  Lebar: number;
  Nomor_SPK: string;
  Jml_Order: number;
  Kurang_Cetak: number;
  Kurang_Jahit: number;
  Kurang_Lipat: number;
}

export interface RekapMonitoringBySpkParams {
  tglAwal: string;
  tglAkhir: string;
  perusahaan?: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/rekap-monitoring-by-spk";

export const rekapMonitoringBySpkService = {
  getBrowse: (params: RekapMonitoringBySpkParams) =>
    api.get<ApiResult<RekapMonitoringBySpkRow[]>>(BASE, { params }),
};
