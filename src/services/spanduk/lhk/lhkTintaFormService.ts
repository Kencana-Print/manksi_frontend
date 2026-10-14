import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-tinta-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkTintaTinta {
  Kode_Bahan: number;
  Nama_Bahan: string | null;
  Satuan: string | null;
  Qty: number;
}

export interface LhkTintaDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  Tinta: LhkTintaTinta[];
}

export interface LhkTintaForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Detail: LhkTintaDetail[];
}

export interface LhkTintaPayloadRow {
  Nomor_SPK: string;
  Tinta: { Kode_Bahan: number; Qty: number }[];
}

export interface LhkTintaPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Detail: LhkTintaPayloadRow[];
}

export interface InfoSpk {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
}

export interface PabrikOption {
  Kode: string;
  Nama: string;
}

export interface BahanOption {
  Kode: number;
  Nama: string;
  Satuan: string | null;
}

export type SaveResponse = AxiosResponse<ApiResponse<{ Nomor: string }>>;

export const getById = async (nomor: string): Promise<LhkTintaForm> => {
  const res = await api.get<ApiResponse<LhkTintaForm>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const getInfoSpk = async (nomor: string): Promise<InfoSpk> => {
  const res = await api.get<ApiResponse<InfoSpk>>(
    `${BASE}/spk/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const getLookupPabrik = async (): Promise<PabrikOption[]> => {
  const res = await api.get<ApiResponse<PabrikOption[]>>(
    `${BASE}/lookups/pabrik`,
  );
  return res.data.data ?? [];
};

// Tanpa search: maksimal 100 bahan tinta/cat aktif (cukup untuk dropdown)
export const getLookupBahan = async (): Promise<BahanOption[]> => {
  const res = await api.get<ApiResponse<BahanOption[]>>(
    `${BASE}/lookups/bahan`,
  );
  return res.data.data ?? [];
};

export const create = (payload: LhkTintaPayload): Promise<SaveResponse> =>
  api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);

export const update = (
  nomor: string,
  payload: LhkTintaPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
