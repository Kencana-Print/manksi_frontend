import api from "@/services/api";

export type StatusKlaim = "AKTIF" | "BATAL";
export type StatusTransferKlaim =
  | "-"
  | "Belum diajukan"
  | "Diajukan"
  | "Terealisasi";

export interface KlaimKasKecilRow {
  Nomor: string;
  Tanggal: string;
  Cabang: string;
  RekTujuan: string;
  NamaRekTujuan: string;
  Total: number;
  Status: StatusKlaim;
  Keterangan: string;
  Dibuat: string;
  JumlahBkk: number;
  NomorPjt: string;
  TglRealisasi: string;
  StatusTransfer: StatusTransferKlaim;
}

export interface KlaimKasKecilDetailRow {
  Nomor: string;
  Bkk: string;
  Bon: string;
  Tanggal: string;
  Uraian: string;
  Nominal: number;
  Tipe: "BKK" | "MANUAL";
  Akun: string;
  CostCenter: string;
}

export interface KlaimKasKecilBrowseParams {
  startDate: string;
  endDate: string;
  cabang?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiMessage {
  success: boolean;
  message: string;
}

const BASE = "/piutang/klaim-kas-kecil";

export const klaimKasKecilService = {
  getBrowse(params: KlaimKasKecilBrowseParams) {
    return api.get<ApiResponse<KlaimKasKecilRow[]>>(BASE, { params });
  },

  getBrowseDetail(params: KlaimKasKecilBrowseParams) {
    return api.get<ApiResponse<KlaimKasKecilDetailRow[]>>(`${BASE}/detail`, {
      params,
    });
  },

  batalKlaim(nomor: string) {
    return api.put<ApiMessage>(`${BASE}/${encodeURIComponent(nomor)}/batal`);
  },
};
