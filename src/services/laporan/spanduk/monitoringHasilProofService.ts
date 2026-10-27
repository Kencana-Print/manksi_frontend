import api from "@/services/api";

export interface MonitoringHasilProofRow {
  Hari: string | null;
  Tanggal: string | null;
  Nomor_LHK: string;
  Nama: string | null;
  Panjang: number | null;
  Lebar: number | null;
  Nomor: string;
  Kunci: string;
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
  Warna1: string;
  Warna2: string;
  Warna3: string;
  Warna4: string;
  Warna5: string;
  Warna6: string;
  Warna7: string;
  Warna8: string;
  Warna9: string;
  Warna10: string;
  J_Proof: number;
  Kain: string | null;
  Meter_Bahan: number;
  Jumlah_Meter: number;
}

export interface MonitoringHasilProofParams {
  tglAwal: string;
  tglAkhir: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/monitoring-hasil-proof";

export const monitoringHasilProofService = {
  getBrowse: (params: MonitoringHasilProofParams) =>
    api.get<ApiResult<MonitoringHasilProofRow[]>>(BASE, { params }),
};
