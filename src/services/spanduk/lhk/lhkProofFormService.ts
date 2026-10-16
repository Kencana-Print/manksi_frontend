import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-proof-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkProofPlangkan {
  Ukuran: number;
  Qty: number;
}

export interface LhkProofDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Plangkan: number | null;
  J_Proof: number | null;
  U1: string | null;
  U2: string | null;
  U3: string | null;
  U4: string | null;
  U5: string | null;
  U6: string | null;
  U7: string | null;
  Plangkan: LhkProofPlangkan[];
}

export interface LhkProofForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Detail: LhkProofDetail[];
}

export interface LhkProofPayloadRow {
  Nomor_SPK: string;
  J_Plangkan: number;
  J_Proof: number;
  U1: string;
  U2: string;
  U3: string;
  U4: string;
  U5: string;
  U6: string;
  U7: string;
  Plangkan: LhkProofPlangkan[];
}

export interface LhkProofPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Detail: LhkProofPayloadRow[];
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

export interface UkuranOption {
  Kode: number;
  Ukuran: number;
}

export type SaveResponse = AxiosResponse<ApiResponse<{ Nomor: string }>>;

export const getById = async (nomor: string): Promise<LhkProofForm> => {
  const res = await api.get<ApiResponse<LhkProofForm>>(
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

export const getLookupUkuran = async (): Promise<UkuranOption[]> => {
  const res = await api.get<ApiResponse<UkuranOption[]>>(
    `${BASE}/lookups/ukuran`,
  );
  return res.data.data ?? [];
};

export const create = (payload: LhkProofPayload): Promise<SaveResponse> =>
  api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);

export const update = (
  nomor: string,
  payload: LhkProofPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
