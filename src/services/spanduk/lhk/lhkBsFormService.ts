import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-bs-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkBsDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  BS_Quiring: number | null;
  BS_Cetak: number | null;
  BS_Bahan: number | null;
  BS_Jahit: number | null;
  BS_Lipat: number | null;
}

export interface LhkBsForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Detail: LhkBsDetail[];
}

export interface LhkBsPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Detail: {
    Nomor_SPK: string;
    BS_Quiring: number;
    BS_Cetak: number;
    BS_Bahan: number;
    BS_Jahit: number;
    BS_Lipat: number;
  }[];
}

export interface PabrikOption {
  Kode: string;
  Nama: string;
}

export interface InfoSpk {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
}

export type SaveResponse = AxiosResponse<ApiResponse<{ Nomor: string }>>;

export const getById = async (nomor: string): Promise<LhkBsForm> => {
  const res = await api.get<ApiResponse<LhkBsForm>>(
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

export const getLookupPabrik = async (
  search?: string,
): Promise<PabrikOption[]> => {
  const res = await api.get<ApiResponse<PabrikOption[]>>(
    `${BASE}/lookups/pabrik`,
    { params: { search } },
  );
  return res.data.data;
};

export const create = (payload: LhkBsPayload): Promise<SaveResponse> =>
  api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);

export const update = (
  nomor: string,
  payload: LhkBsPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
