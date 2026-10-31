import api from "@/services/api";

export type StatusSelisih =
  | "BELUM_CETAK"
  | "SESUAI"
  | "SELISIH"
  | "PCS_BERUBAH"
  | "KOLI_TIDAK_VALID"
  | "SPK_TIDAK_ADA"
  | "STBJ_HILANG";

export interface CetakBarcodeKoliRow {
  Nomor: string;
  Tanggal: string;
  Cab: string;
  StbjNomor: string;
  UserNama: string;
  KoliAktif: number;
  KoliDiterima: number;
  KoliVoid: number;
}

export interface CetakBarcodeKoliDetailRow {
  Spk: string;
  NamaSpk: string;
  Dibuat: number;
  Aktif: number;
  Diterima: number;
  Void: number;
  TotalCetak: number;
}

export interface CetakBarcodeKoliSelisihRow {
  StbjNomor: string;
  Tanggal: string;
  Gudang: string;
  Spk: string;
  PcsStbj: number;
  PcsCetak?: number | null;
  KoliStbj: number;
  KoliAktif: number;
  KoliDiterima: number;
  Status: StatusSelisih;
}

export interface CetakBarcodeKoliBrowseParams {
  tglAwal: string;
  tglAkhir: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/garmen/bahan-jadi/cetak-barcode-koli";

export const cetakBarcodeKoliService = {
  getBrowse(params: CetakBarcodeKoliBrowseParams) {
    return api.get<ApiResponse<CetakBarcodeKoliRow[]>>(BASE, { params });
  },

  getDetail(nomor: string) {
    return api.get<ApiResponse<CetakBarcodeKoliDetailRow[]>>(
      `${BASE}/${encodeURIComponent(nomor)}/detail`,
    );
  },

  getSelisih(
    params: CetakBarcodeKoliBrowseParams & { hanyaSelisih?: boolean },
  ) {
    return api.get<ApiResponse<CetakBarcodeKoliSelisihRow[]>>(
      `${BASE}/selisih`,
      {
        params: {
          tglAwal: params.tglAwal,
          tglAkhir: params.tglAkhir,
          hanyaSelisih: params.hanyaSelisih ? "1" : "0",
        },
      },
    );
  },
};
