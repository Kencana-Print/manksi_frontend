import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-hapus-plankan-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkHapusPlankanDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Plangkan: number | null;
  J_Meter: number | null;
  Ukuran: number | null;
  Jumlah_Meter: number | null;
  Rinso: number | null;
  Porstek: number | null;
  M46: number | null;
  Kaporit: number | null;
  Caustik: number | null;
  Keterangan: string | null;
}

export interface LhkHapusPlankanForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Detail: LhkHapusPlankanDetail[];
}

export interface LhkHapusPlankanPayloadRow {
  Nomor_SPK: string;
  J_Plangkan: number;
  Ukuran: number;
  Rinso: number;
  Porstek: number;
  M46: number;
  Kaporit: number;
  Caustik: number;
  Keterangan: string;
}

export interface LhkHapusPlankanPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Detail: LhkHapusPlankanPayloadRow[];
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

export type SaveResponse = AxiosResponse<ApiResponse<{ Nomor: string }>>;

export const getById = async (nomor: string): Promise<LhkHapusPlankanForm> => {
  const res = await api.get<ApiResponse<LhkHapusPlankanForm>>(
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

export const create = (
  payload: LhkHapusPlankanPayload,
): Promise<SaveResponse> =>
  api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);

export const update = (
  nomor: string,
  payload: LhkHapusPlankanPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
