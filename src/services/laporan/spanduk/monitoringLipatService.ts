import api from "@/services/api";

export interface MonitoringLipatRow {
  Hari: string | null;
  Tanggal: string | null;
  Perusahaan: string | null;
  Tgl_SPK: string | null;
  Deadline: string | null;
  Jenis_Kode: string | null;
  Jenis_Nama: string | null;
  Nama: string | null;
  Nomor: string;
  Panjang: number;
  Lebar: number;
  Jml_Order: number;
  J_Meter: number;
  Kain: string | null;
  Kurang: number;
  Jml_P01: number;
  Jml_P02: number;
  Jml_Lipat: number;
  Meter_P01: number;
  Meter_P02: number;
  Meter_Lipat: number;
}

export interface MonitoringLipatParams {
  tglAwal: string;
  tglAkhir: string;
  perusahaan?: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/monitoring-lipat";

export const monitoringLipatService = {
  getBrowse: (params: MonitoringLipatParams) =>
    api.get<ApiResult<MonitoringLipatRow[]>>(BASE, { params }),
};
