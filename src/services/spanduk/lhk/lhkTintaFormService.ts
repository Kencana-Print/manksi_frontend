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
  Kode_Bahan: string;
  Nama_Bahan: string | null;
  Satuan: string | null;
  Qty: number; // total dalam satuan master
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
  Kode_Bahan: string;
  Kg: string;
  Ons: string;
  Gram: string;
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
  Apv_Status: string | null;
  Lewat_Batas: number; // 1 = hari ini sudah lewat h+7 dari tanggal LHK Cetak
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

// Stok per lokasi; null bila lokasi belum dipilih
export interface BahanOption {
  Kode: string;
  Nama: string;
  Satuan: string;
  Stok: number | null;
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

// Daftar obat (baris default form) + stok per lokasi
export const getLookupBahan = async (
  pabrik: string,
  nomor: string,
): Promise<BahanOption[]> => {
  const res = await api.get<ApiResponse<BahanOption[]>>(
    `${BASE}/lookups/bahan`,
    { params: { pabrik, nomor } },
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
