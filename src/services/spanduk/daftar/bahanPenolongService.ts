import api from "@/services/api";
import type {
  LookupCategory,
  LookupOption,
  MasterBahanDetail,
  MasterBahanPayload,
  MasterBahanRow,
} from "@/services/spanduk/daftar/masterBahanService";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";
export type {
  LookupCategory,
  LookupOption,
} from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/daftar/bahan-penolong";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Kode barang penolong berupa teks (varchar(20)), diketik manual, dan bisa
// memuat "/" (mis. PMBL.3/8) — selalu di-encode saat masuk ke URL.
export type BahanPenolongRow = Omit<MasterBahanRow, "Kode"> & { Kode: string };
export type BahanPenolongDetail = Omit<MasterBahanDetail, "Brg_kode"> & {
  Brg_kode: string;
};
export type BahanPenolongPayload = MasterBahanPayload & { Brg_kode?: string };

interface LookupRaw {
  Kode: string | number;
  Nama: string;
}

export const getBrowse = async (): Promise<BahanPenolongRow[]> => {
  const res = await api.get<ApiResponse<BahanPenolongRow[]>>(BASE);
  return res.data.data;
};

export const getById = async (kode: string): Promise<BahanPenolongDetail> => {
  const res = await api.get<ApiResponse<BahanPenolongDetail>>(
    `${BASE}/${encodeURIComponent(kode)}`,
  );
  return res.data.data;
};

export const create = async (payload: BahanPenolongPayload): Promise<void> => {
  await api.post(BASE, payload);
};

export const update = async (
  kode: string,
  payload: BahanPenolongPayload,
): Promise<void> => {
  await api.put(`${BASE}/${encodeURIComponent(kode)}`, payload);
};

export const remove = async (kode: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(kode)}`);
};

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
