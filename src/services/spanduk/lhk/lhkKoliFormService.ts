import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-koli-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PabrikOption {
  Kode: string;
  Nama: string;
}

export interface LhkKoliDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Koli: number | null;
}

export interface LhkKoliForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Jml_Discan: number;
  Detail: LhkKoliDetail[];
}

export interface InfoSpk {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
}

export interface LhkKoliPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Detail: { Nomor_SPK: string; J_Koli: number }[];
}

export interface KoliUnit {
  Id: number;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Panjang: number | null;
  Lebar: number | null;
  Urut: number;
  Total: number;
}

export interface LhkKoliPrint {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Units: KoliUnit[];
}

export type SaveResponse = AxiosResponse<ApiResponse<{ Nomor: string }>>;

export const getById = async (nomor: string): Promise<LhkKoliForm> => {
  const res = await api.get<ApiResponse<LhkKoliForm>>(
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

export const getLookupPabrik = async (search = ""): Promise<PabrikOption[]> => {
  const res = await api.get<ApiResponse<PabrikOption[]>>(
    `${BASE}/lookups/pabrik`,
    { params: { search } },
  );
  return res.data.data;
};

export const getPrint = async (nomor: string): Promise<LhkKoliPrint> => {
  const res = await api.get<ApiResponse<LhkKoliPrint>>(
    `${BASE}/print/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const create = (payload: LhkKoliPayload): Promise<SaveResponse> =>
  api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);

export const update = (
  nomor: string,
  payload: LhkKoliPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
