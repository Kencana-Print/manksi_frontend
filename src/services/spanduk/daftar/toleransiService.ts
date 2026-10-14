import api from "@/services/api";
import type { LookupOption } from "@/services/spanduk/daftar/masterBahanService";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";
export type { LookupOption } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/daftar/toleransi";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ToleransiRow {
  Kode: number;
  Jenis: string;
  Nama: string | null;
  Ukuran: number;
  Toleransi: number | null;
}

export type ToleransiDetail = ToleransiRow;

export interface ToleransiPayload {
  Jenis: string;
  Ukuran: string;
  Toleransi: string;
}

interface LookupRaw {
  Kode: string | number;
  Nama: string | null;
}

export const getBrowse = async (): Promise<ToleransiRow[]> => {
  const res = await api.get<ApiResponse<ToleransiRow[]>>(BASE);
  return res.data.data;
};

export const getById = async (kode: number): Promise<ToleransiDetail> => {
  const res = await api.get<ApiResponse<ToleransiDetail>>(`${BASE}/${kode}`);
  return res.data.data;
};

// Mengembalikan kode (id auto_increment) data baru
export const create = async (payload: ToleransiPayload): Promise<number> => {
  const res = await api.post<ApiResponse<{ Kode: number }>>(BASE, payload);
  return res.data.data.Kode;
};

export const update = async (
  kode: number,
  payload: ToleransiPayload,
): Promise<void> => {
  await api.put(`${BASE}/${kode}`, payload);
};

export const remove = async (kode: number): Promise<void> => {
  await api.delete(`${BASE}/${kode}`);
};

export const getLookupJenis = async (): Promise<LookupOption[]> => {
  const res = await api.get<ApiResponse<LookupRaw[]>>(`${BASE}/lookups/jenis`);
  return (res.data.data ?? []).map((r) => ({
    Kode: String(r.Kode),
    Nama: r.Nama ?? "",
  }));
};
