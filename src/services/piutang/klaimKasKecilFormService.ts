import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";

const BASE = "/piutang/klaim-kas-kecil-form";

export interface RekeningInfo {
  kode: string;
  nama: string;
  rekening: string;
}

export interface KlaimDefaults {
  cabang: string;
  rekTujuan: RekeningInfo;
  tanggalMulai: string;
  cabangOpsi: string[];
}

export interface BkkOption {
  bon: string;
  bkk: string;
  tanggal: string;
  penerima: string;
  keterangan: string;
  nominal: number;
}

export interface KlaimDetailLoaded {
  bkk: string;
  bon: string;
  tanggal: string;
  uraian: string;
  nominal: number;
}

export interface KlaimLoaded {
  nomor: string;
  tanggal: string;
  cabang: string;
  rekTujuan: RekeningInfo;
  total: number;
  keterangan: string;
  status: string;
  dibuat: string;
  nomorPjt: string;
  bisaUbah: boolean;
  detail: KlaimDetailLoaded[];
}

export interface KlaimDetailPayload {
  bkk: string;
}

export interface KlaimPayload {
  cabang: string;
  tanggal: string;
  keterangan: string;
  detail: KlaimDetailPayload[];
}

export interface KlaimSaveHasil {
  nomor: string;
  total: number;
}

export const klaimKasKecilFormService = {
  getDefaults: (cabang?: string) =>
    api.get<ApiResult<KlaimDefaults>>(`${BASE}/defaults`, {
      params: { cabang },
    }),

  getBkkOptions: (search: string, exceptNomor: string, cabang: string) =>
    api.get<ApiResult<BkkOption[]>>(`${BASE}/bkk-options`, {
      params: { search, exceptNomor, cabang },
    }),

  getById: (nomor: string) =>
    api.get<ApiResult<KlaimLoaded>>(`${BASE}/${encodeURIComponent(nomor)}`),

  save: (payload: KlaimPayload) =>
    api.post<ApiResult<KlaimSaveHasil>>(`${BASE}`, payload),

  update: (nomor: string, payload: KlaimPayload) =>
    api.put<ApiResult<KlaimSaveHasil>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
      payload,
    ),
};
