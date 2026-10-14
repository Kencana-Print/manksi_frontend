import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-quiring-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PabrikOption {
  Kode: string;
  Nama: string;
}

export interface LhkQuiringDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Koli: number | null;
  J_Oven: number | null;
  J_Jemuran: number | null;
  J_Potong: number | null;
}

export interface LhkQuiringForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Detail: LhkQuiringDetail[];
}

export interface InfoSpk {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
}

export interface LhkQuiringPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Detail: {
    Nomor_SPK: string;
    J_Koli: number;
    J_Oven: number;
    J_Jemuran: number;
    J_Potong: number;
  }[];
}

export interface SaveResponse {
  data?: { data?: { Nomor?: string } };
}

export const getById = async (nomor: string): Promise<LhkQuiringForm> => {
  const res = await api.get<ApiResponse<LhkQuiringForm>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const getInfoSpk = async (nomor: string): Promise<InfoSpk> => {
  const res = await api.get<ApiResponse<InfoSpk>>(
    `${BASE}/info-spk/${encodeURIComponent(nomor)}`,
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

export const create = async (
  payload: LhkQuiringPayload,
): Promise<SaveResponse> => {
  return api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);
};

export const update = async (
  nomor: string,
  payload: LhkQuiringPayload,
): Promise<SaveResponse> => {
  return api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
};
