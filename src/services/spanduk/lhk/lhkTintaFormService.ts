import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-tinta-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// SPK/MAP di dalam LHK Cetak (read-only di form Tinta)
export interface LhkTintaSpk {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
}

export interface LhkTintaBahan {
  Kode_Bahan: number;
  Nama_Bahan: string | null;
  Satuan_Master: string | null;
  Pilihan_Satuan: string[];
  Qty_Input: number;
  Satuan_Input: string | null;
  Qty: number;
  Satuan: string | null;
}

export interface LhkTintaForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Nomor_Cetak: string | null;
  Tanggal_Cetak: string | null;
  Detail: LhkTintaSpk[];
  Bahan: LhkTintaBahan[];
}

export interface LhkTintaPayloadBahan {
  Kode_Bahan: number;
  Qty: string;
  Satuan: string;
}

export interface LhkTintaPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Nomor_Cetak: string;
  Bahan: LhkTintaPayloadBahan[];
}

export interface CetakInfo {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Detail: LhkTintaSpk[];
}

export interface CetakOption {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Jml_SPK: number;
  Daftar_SPK: string | null;
}

export interface CetakPage {
  items: CetakOption[];
  total: number;
}

// Pilihan_Satuan kosong = bahan diinput dalam satuan master
export interface BahanOption {
  Kode: number;
  Nama: string;
  Satuan: string | null;
  Pilihan_Satuan: string[];
}

export type SaveResponse = AxiosResponse<ApiResponse<{ Nomor: string }>>;

export const getById = async (nomor: string): Promise<LhkTintaForm> => {
  const res = await api.get<ApiResponse<LhkTintaForm>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const getInfoCetak = async (nomor: string): Promise<CetakInfo> => {
  const res = await api.get<ApiResponse<CetakInfo>>(
    `${BASE}/cetak/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const getLookupCetak = async (
  q: string,
  page: number,
  limit: number,
): Promise<CetakPage> => {
  const res = await api.get<ApiResponse<CetakPage>>(`${BASE}/lookups/cetak`, {
    params: { q, page, limit },
  });
  return res.data.data;
};

// Semua bahan tinta/cat aktif = baris default form (maksimal 500)
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
