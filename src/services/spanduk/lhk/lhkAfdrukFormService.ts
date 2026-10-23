import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-afdruk-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkAfdrukPlangkan {
  Ukuran: number;
  Qty: number;
}

export interface LhkAfdrukDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Plangkan: number;
  J_Meter: number | null;
  Jumlah_Meter: number;
  Keterangan: string | null;
  Plangkan: LhkAfdrukPlangkan[];
}

export interface LhkAfdrukBahan {
  Kode_Bahan: number;
  Nama_Bahan: string | null;
  Satuan: string | null;
  Qty: number;
}

export interface BahanOption {
  Kode: number;
  Nama: string;
  Satuan: string | null;
  Stok: number | null;
}

export interface LhkAfdrukPayloadBahan {
  Kode_Bahan: number;
  Qty: number;
}

export interface LhkAfdrukForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Bahan: LhkAfdrukBahan[];
  Detail: LhkAfdrukDetail[];
}

export interface LhkAfdrukPayloadRow {
  Nomor_SPK: string;
  Keterangan: string;
  Plangkan: LhkAfdrukPlangkan[];
}

export interface LhkAfdrukPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Bahan: LhkAfdrukPayloadBahan[];
  Detail: LhkAfdrukPayloadRow[];
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

export const getById = async (nomor: string): Promise<LhkAfdrukForm> => {
  const res = await api.get<ApiResponse<LhkAfdrukForm>>(
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

export const getLookupBahan = async (): Promise<BahanOption[]> => {
  const res = await api.get<ApiResponse<BahanOption[]>>(
    `${BASE}/lookups/bahan`,
  );
  return res.data.data ?? [];
};

export const create = (payload: LhkAfdrukPayload): Promise<SaveResponse> =>
  api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);

export const update = (
  nomor: string,
  payload: LhkAfdrukPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
