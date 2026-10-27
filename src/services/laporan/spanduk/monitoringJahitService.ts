import api from "@/services/api";

export interface MonitoringJahitRow {
  Hari: string | null;
  Tanggal: string | null;
  Perusahaan: string | null;
  Tgl_SPK: string | null;
  Deadline: string | null;
  Jenis_Order: string | null;
  Nama: string | null;
  Nomor: string;
  Panjang: number;
  Lebar: number;
  Jml_Order: number;
  J_Meter: number;
  Kain: string | null;
  Kurang: number;
  Jml_Luar: number;
  Jml_P02: number;
  Jml_Jahit: number;
  Meter_Luar: number;
  Meter_P02: number;
  Meter_Jahit: number;
}

export interface MonitoringJahitParams {
  tglAwal: string;
  tglAkhir: string;
  perusahaan?: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/monitoring-jahit";

export const monitoringJahitService = {
  getBrowse: (params: MonitoringJahitParams) =>
    api.get<ApiResult<MonitoringJahitRow[]>>(BASE, { params }),
};
