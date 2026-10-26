import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/mutasi-marketing-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MapSerahOption {
  Nomor: string;
  Tanggal: string;
  Nama: string;
  Ukuran: string;
  Jumlah: number;
  Tipe: string;
  Lokasi: string;
  MO: string;
}

export interface MutasiMarketingMapRow {
  nomor: string;
  nama: string;
  ukuran: string;
  qtyJadi: number;
  qtyKirim: number;
  mo: string;
  tglDiterima: string | null;
}

export interface MutasiMarketingFormData {
  header: {
    nomor: string;
    tanggal: string;
    cab: string;
    keterangan: string;
  };
  maps: MutasiMarketingMapRow[];
  sudahDiterima: boolean;
}

export interface MutasiMarketingPayload {
  tanggal: string;
  keterangan: string;
  maps: { nomor: string; qtyKirim: number }[];
}

export interface SaveResponse {
  success: boolean;
  message?: string;
  data?: { nomor: string };
}

export interface MutasiMarketingPrintRow {
  nomor: string;
  nama: string;
  ukuran: string;
  tipe: string;
  qty: number; // jumlah kirim
  qtyJadi: number;
  mo: string;
}

export interface MutasiMarketingPrintData {
  header: {
    nomor: string;
    tanggal: string;
    cab: string;
    keterangan: string;
    pembuat: string;
  };
  maps: MutasiMarketingPrintRow[];
}

export const getLookupMap = async (): Promise<MapSerahOption[]> => {
  const res = await api.get<ApiResponse<MapSerahOption[]>>(
    `${BASE}/lookups/map`,
  );
  return res.data.data;
};

export const getById = async (
  nomor: string,
): Promise<MutasiMarketingFormData> => {
  const res = await api.get<ApiResponse<MutasiMarketingFormData>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const getPrintData = async (
  nomor: string,
): Promise<MutasiMarketingPrintData> => {
  const res = await api.get<ApiResponse<MutasiMarketingPrintData>>(
    `${BASE}/print/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const create = async (
  payload: MutasiMarketingPayload,
): Promise<SaveResponse> => {
  const res = await api.post<SaveResponse>(BASE, payload);
  return res.data;
};

export const update = async (
  nomor: string,
  payload: MutasiMarketingPayload,
): Promise<SaveResponse> => {
  const res = await api.put<SaveResponse>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
  return res.data;
};
