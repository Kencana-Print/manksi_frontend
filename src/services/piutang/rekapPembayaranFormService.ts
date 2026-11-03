import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";

const BASE = "/piutang/rekap-pembayaran-form";

export interface SupplierRekap {
  kode: string;
  nama: string;
}

export interface InfoNota {
  tipe: string;
  kategori: string;
  nomor: string;
  tanggal: string | null;
  keterangan: string;
  sisaNota: number;
  rencanaLain: number;
  tersedia: number;
  pengurang: boolean;
}

export interface TagihanItem {
  tipe: string;
  kategori: string;
  kategoriUrut: number;
  nota: string;
  tanggal: string;
  jatuhTempo: string | null;
  sisaNota: number;
  rencanaLain: number;
  tersedia: number;
}

export interface TagihanParams {
  supKode: string;
  startDate: string;
  endDate: string;
  excludeNomor: string;
}

export interface VoucherOption {
  nomor: string;
  tanggal: string;
  supKode: string;
  supplier: string;
  keterangan: string;
  nominal: number;
  kategori: string;
  kategoriUrut: number;
}

export interface RekapDetailPayload {
  supKode: string;
  bulanTagihan: string;
  tipe: string;
  nota: string;
  nominal: number;
  tglRencana: string | null;
  fakturPajak: string;
  invoice: string;
  keterangan: string;
}

export interface RekapPayload {
  tanggal: string;
  keterangan: string;
  detail: RekapDetailPayload[];
}

export interface SaveHasil {
  nomor: string;
  peringatan: string[];
}

export interface RekapDetailLoaded {
  noUrut: number;
  supKode: string;
  supNama: string;
  supRekening: string;
  supBank: string;
  supAtasnama: string;
  bulanTagihan: string;
  tipe: string;
  kategori: string;
  kategoriUrut: number;
  nota: string;
  tglNota: string | null;
  nilaiNota: number;
  nominal: number;
  tglRencana: string | null;
  fakturPajak: string;
  invoice: string;
  keterangan: string;
  vouNomor: string;
  pjtNomor: string;
}

export interface RekapLoaded {
  nomor: string;
  tanggal: string;
  keterangan: string;
  status: string;
  alasanBatal: string;
  userCreate: string;
  bisaUbah: boolean;
  total: number;
  jumlahSupplier: number;
  detail: RekapDetailLoaded[];
}

export const rekapPembayaranFormService = {
  getSupplier: (kode: string) =>
    api.get<ApiResult<SupplierRekap>>(
      `${BASE}/lookups/supplier/${encodeURIComponent(kode)}`,
    ),

  getInfoNota: (
    tipe: string,
    nota: string,
    supKode: string,
    excludeNomor: string,
  ) =>
    api.get<ApiResult<InfoNota>>(`${BASE}/lookups/nota-detail`, {
      params: { tipe, nota, supKode, excludeNomor },
    }),

  getTagihan: (params: TagihanParams) =>
    api.get<ApiResult<TagihanItem[]>>(`${BASE}/lookups/tagihan`, { params }),

  getVoucherOptions: (search: string, excludeNomor: string) =>
    api.get<ApiResult<VoucherOption[]>>(`${BASE}/lookups/voucher`, {
      params: { search, excludeNomor },
    }),

  getById: (nomor: string) =>
    api.get<ApiResult<RekapLoaded>>(`${BASE}/${encodeURIComponent(nomor)}`),

  save: (payload: RekapPayload) =>
    api.post<ApiResult<SaveHasil>>(`${BASE}`, payload),

  update: (nomor: string, payload: RekapPayload) =>
    api.put<ApiResult<SaveHasil>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
      payload,
    ),
};
