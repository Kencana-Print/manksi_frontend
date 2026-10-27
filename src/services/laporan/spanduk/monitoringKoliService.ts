import api from "@/services/api";

export interface MonitoringKoliRow {
  Hari: string | null;
  Tanggal: string | null;
  Nomor_LHK: string;
  Perusahaan: string | null;
  Tgl_SPK: string | null;
  Deadline: string | null;
  Nama: string | null;
  Nomor: string;
  Kunci: string;
  Panjang: number | null;
  Lebar: number | null;
  Jml_Order: number;
  J_Meter: number;
  Kain: string | null;
  J_Koli: number;
}

export interface MonitoringKoliParams {
  tglAwal: string;
  tglAkhir: string;
  perusahaan?: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/monitoring-koli";

export const monitoringKoliService = {
  getBrowse: (params: MonitoringKoliParams) =>
    api.get<ApiResult<MonitoringKoliRow[]>>(BASE, { params }),
};
