import api from "@/services/api";

export interface MonitoringCuiringRow {
  Hari: string | null;
  Tanggal: string | null;
  Perusahaan: string | null;
  Tgl_SPK: string | null;
  Deadline: string | null;
  Nama: string | null;
  Nomor: string;
  Panjang: number;
  Lebar: number;
  Jml_Order: number;
  J_Meter: number;
  Kain: string | null;
  Kurang_Oven: number;
  Kurang_Jemuran: number;
  Kurang_Potong: number;
  Oven: number;
  Jemuran: number;
  Potong: number;
  Meter_Oven: number;
}

export interface MonitoringCuiringParams {
  tglAwal: string;
  tglAkhir: string;
  perusahaan?: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/monitoring-cuiring";

export const monitoringCuiringService = {
  getBrowse: (params: MonitoringCuiringParams) =>
    api.get<ApiResult<MonitoringCuiringRow[]>>(BASE, { params }),
};
