import api from "@/services/api";

export interface MonitoringAfdrukRow {
  Hari: string | null;
  Tanggal: string | null;
  Nomor_LHK: string;
  Kunci: string;
  Nama: string | null;
  Panjang: number | null;
  Lebar: number | null;
  Nomor: string;
  U050: number;
  U100: number;
  U120: number;
  U150: number;
  U180: number;
  U230: number;
  U250: number;
  U280: number;
  U350: number;
  U400: number;
  U450: number;
  U550: number;
  U580: number;
  U650: number;
  U750: number;
  J_Plangkan: number;
  J_Meter: number;
  Jumlah_Meter: number;
  Rinso: number;
  Porstek: number;
  M46: number;
  Kaporit: number;
  Caustik: number;
  Ulano: number;
  Screen: number;
  Lem: number;
  Katalis: number;
  Keterangan: string | null;
}

export interface MonitoringAfdrukParams {
  tglAwal: string;
  tglAkhir: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/monitoring-afdruk";

export const monitoringAfdrukService = {
  getBrowse: (params: MonitoringAfdrukParams) =>
    api.get<ApiResult<MonitoringAfdrukRow[]>>(BASE, { params }),
};
