import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-cetak-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkCetakDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  Qty_Cetak: number;
  Jml_Plangkan: number;
}

export interface LhkCetakKaryawan {
  Nik: string;
  Nama: string;
  Absensi: number;
  Lembur: number;
}

export interface LhkCetakForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Kar_Borongan: number;
  Kar_Harian: number;
  Detail: LhkCetakDetail[];
  Karyawan: LhkCetakKaryawan[];
}

export interface LhkCetakPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Kar_Borongan: number;
  Kar_Harian: number;
  Detail: { Nomor_SPK: string; Qty_Cetak: number; Jml_Plangkan: number }[];
  Karyawan: { Nik: string; Absensi: number; Lembur: number }[];
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

export interface KaryawanOption {
  Nik: string;
  Nama: string;
}

export type SaveResponse = AxiosResponse<ApiResponse<{ Nomor: string }>>;

export const getById = async (nomor: string): Promise<LhkCetakForm> => {
  const res = await api.get<ApiResponse<LhkCetakForm>>(
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

export const getLookupKaryawan = async (
  pabrik: string,
): Promise<KaryawanOption[]> => {
  const res = await api.get<ApiResponse<KaryawanOption[]>>(
    `${BASE}/lookups/karyawan`,
    { params: { pabrik } },
  );
  return res.data.data ?? [];
};

export const create = (payload: LhkCetakPayload): Promise<SaveResponse> =>
  api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);

export const update = (
  nomor: string,
  payload: LhkCetakPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
