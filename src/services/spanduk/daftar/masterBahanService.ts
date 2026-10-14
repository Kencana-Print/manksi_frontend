import api from "@/services/api";
import { isAxiosError } from "axios";

const BASE = "/spanduk/daftar/master-bahan";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MasterBahanRow {
  Gudang: string | null;
  Divisi: string | null;
  Kategori: string | null;
  Kode: number;
  Nama: string;
  Jenis: string | null;
  Supplier: string | null;
  Konstruksi: string | null;
  Panjang: string | null;
  Lebar: string | null;
  Satuan: string | null;
  Status: string | null;
  Stok: number;
}

export interface MasterBahanDetail {
  Brg_kode: number;
  Brg_nama: string;
  Brg_satuan: string | null;
  Brg_gramasi: string | null;
  Brg_panjang: string | null;
  Brg_lebar: string | null;
  Brg_jenis: string | number | null;
  nmJenis: string;
  Brg_ktg_kode: string | number | null;
  nmKategori: string;
  Brg_gdg_default: string | null;
  nmGudang: string;
  Brg_sup_kode: string | null;
  nmSupplier: string;
  Brg_divisi: number;
  nmDivisi: string;
  Brg_hrgbeli: number | null;
  Brg_hrgjual: number | null;
  Brg_isaktif: number | null;
  Brg_isstok: number | null;
  Brg_isexpired: number | null;
  Brg_status: string | null;
}

export interface MasterBahanPayload {
  Brg_nama: string;
  Brg_divisi: string;
  Brg_ktg_kode: string;
  Brg_jenis: string;
  Brg_gdg_default: string;
  Brg_sup_kode: string;
  Brg_satuan: string;
  Brg_gramasi: string;
  Brg_panjang: string;
  Brg_lebar: string;
  Brg_status: string;
  Brg_hrgbeli: number;
  Brg_hrgjual: number;
  Brg_isaktif: 0 | 1;
  Brg_isstok: 0 | 1;
  Brg_isexpired: 0 | 1;
}

export type LookupCategory =
  | "kategori"
  | "gudang"
  | "jenis"
  | "supplier"
  | "divisi"
  | "status";

export interface LookupOption {
  Kode: string;
  Nama: string;
}

interface LookupRaw {
  Kode: string | number;
  Nama: string;
}

export const pesanError = (e: unknown, fallback: string): string =>
  isAxiosError<{ message?: string }>(e)
    ? (e.response?.data?.message ?? fallback)
    : fallback;

export const getBrowse = async (): Promise<MasterBahanRow[]> => {
  const res = await api.get<ApiResponse<MasterBahanRow[]>>(BASE);
  return res.data.data;
};

export const getById = async (kode: number): Promise<MasterBahanDetail> => {
  const res = await api.get<ApiResponse<MasterBahanDetail>>(`${BASE}/${kode}`);
  return res.data.data;
};

export const create = async (payload: MasterBahanPayload): Promise<void> => {
  await api.post(BASE, payload);
};

export const update = async (
  kode: number,
  payload: MasterBahanPayload,
): Promise<void> => {
  await api.put(`${BASE}/${kode}`, payload);
};

export const remove = async (kode: number): Promise<void> => {
  await api.delete(`${BASE}/${kode}`);
};

// Kode dinormalkan ke string supaya cocok dengan nilai form
// (kolom master bisa bertipe int atau varchar).
export const getLookup = async (
  category: LookupCategory,
  search = "",
): Promise<LookupOption[]> => {
  const res = await api.get<ApiResponse<LookupRaw[]>>(
    `${BASE}/lookups/${category}`,
    { params: search ? { search } : undefined },
  );
  return (res.data.data ?? []).map((r) => ({
    Kode: String(r.Kode),
    Nama: r.Nama,
  }));
};
