import api from "@/services/api";

export type LpkGrain = "hari" | "bulan";

export interface LpkBulananRow {
  periode: string; // YYYY-MM (bulan) atau YYYY-MM-DD (hari)
  bulan: string; // YYYY-MM
  spk: string;
  nama: string;
  kodeProduk: string;
  panjang: number;
  lebar: number;
  lokasi: string;
  kain: string;
  supplier: string;
  jmlSpk: number;
  hasilCetak: number;
  yardCetak: number;
  jmlOrder: number;
  yardOrder: number;
  toleransiPersen: number | null;
  yardToleransi: number;
  ambil: number;
  sisa: number;
  aktual: number;
  yardPakai: number;
  waste: number;
  loss: number;
  persenLoss: number | null;
}

export interface LpkBulananCatatan {
  returTanpaSpk: number;
}

export interface LpkBulananData {
  rows: LpkBulananRow[];
  catatan: LpkBulananCatatan;
}

export interface LpkBulananParams {
  tglAwal: string;
  tglAkhir: string;
  grain: LpkGrain;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const laporanLpkBulananService = {
  getData: (params: LpkBulananParams) =>
    api.get<ApiResponse<LpkBulananData>>(
      "/laporan/spanduk/laporan-lpk-bulanan",
      { params },
    ),
};
