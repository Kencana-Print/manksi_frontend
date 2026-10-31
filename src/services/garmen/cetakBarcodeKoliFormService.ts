import api from "@/services/api";
import type { ApiResponse } from "@/services/garmen/cetakBarcodeKoliService";

export interface StbjOption {
  nomor: string;
  tanggal: string;
  gdg: string;
}

export type StatusSpk =
  | "SIAP"
  | "SUDAH"
  | "SELISIH"
  | "TERBLOKIR"
  | "KOLI_TIDAK_VALID";

export interface GateRow {
  size: string;
  pcs: number;
  lhk: number | null;
  terpakaiLain: number;
  sisa: number;
  ok: boolean;
}

export interface AnalisisSpk {
  spk: string;
  nama: string;
  koliStbj: number;
  koliAktif: number;
  status: StatusSpk;
  pesan: string;
  gate: GateRow[];
}

export interface AnalisisStbj {
  stbj: { nomor: string; tanggal: string; gdg: string; cab: string };
  gateMemblokir: boolean;
  spk: AnalisisSpk[];
}

export interface PrintUnit {
  koliId: string;
  spk: string;
  namaSpk: string | null;
  stbj: string;
  tanggal: string;
  urut: number;
  cab: string;
}

export interface SaveResult {
  nomor: string;
  units: PrintUnit[];
  dilewati: { spk: string; status: string; pesan: string }[];
}

export type StatusKoli = "DIBUAT" | "DITERIMA_FG" | "DIMUAT" | "VOID";

export interface KoliRow {
  koliId: string;
  spk: string;
  namaSpk: string | null;
  urut: number;
  status: StatusKoli;
  jumlahCetak: number;
  voidAlasan: string | null;
}

export interface FormDetail {
  header: {
    nomor: string;
    tanggal: string;
    cab: string;
    stbjNomor: string;
    keterangan: string | null;
    userCreate: string;
  };
  koli: KoliRow[];
}

export interface SavePayload {
  tanggal: string;
  stbjNomor: string;
  keterangan: string;
}

export interface VoidPayload {
  koliIds: string[];
  alasan: string;
}

const BASE = "/garmen/bahan-jadi/cetak-barcode-koli/form";

export const STBJ_LOOKUP_ENDPOINT = `${BASE}/search-stbj`;

export const cetakBarcodeKoliFormService = {
  searchStbj(q: string, limit = 30) {
    return api.get<ApiResponse<StbjOption[]>>(`${BASE}/search-stbj`, {
      params: { q, limit },
    });
  },

  preview(stbj: string) {
    return api.get<ApiResponse<AnalisisStbj>>(`${BASE}/preview`, {
      params: { stbj },
    });
  },

  getDetail(nomor: string) {
    return api.get<ApiResponse<FormDetail>>(
      `${BASE}/${encodeURIComponent(nomor)}/detail`,
    );
  },

  save(payload: SavePayload) {
    return api.post<ApiResponse<SaveResult>>(`${BASE}/save`, payload);
  },

  cetakUlang(nomor: string, koliIds: string[]) {
    return api.post<ApiResponse<{ nomor: string; units: PrintUnit[] }>>(
      `${BASE}/${encodeURIComponent(nomor)}/reprint`,
      { koliIds },
    );
  },

  voidKoli(payload: VoidPayload) {
    return api.post<ApiResponse<{ jumlah: number }>>(`${BASE}/void`, payload);
  },
};
