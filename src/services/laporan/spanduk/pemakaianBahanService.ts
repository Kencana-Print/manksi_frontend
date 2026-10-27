import api from "@/services/api";

export interface PemakaianBahanRow {
  Kunci: string;
  Tanggal: string;
  Nomor_LHK: string;
  Sesi: string | null;
  Kode_Pabrik: string | null;
  Kode_Bahan: number | string;
  Nama_Bahan: string | null;
  Lebar: string | null;
  Qty_Meter: number;
}

export interface PemakaianBahanParams {
  tglAwal: string;
  tglAkhir: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/pemakaian-bahan";

export const pemakaianBahanService = {
  getBrowse: (params: PemakaianBahanParams) =>
    api.get<ApiResult<PemakaianBahanRow[]>>(BASE, { params }),
};
