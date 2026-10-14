import api from "@/services/api";
import type {
  KolomDetail,
  NilaiDetail,
} from "@/services/spanduk/mutasiProduksiSpandukService";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/mutasi-produksi-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type JenisSumber = "SPK" | "MAP";

export interface PabrikOption {
  Kode: string;
  Nama: string;
}

export interface LiniAsalOption {
  Kode: string;
  Nama: string;
  Tersedia: boolean;
  Kode_Berikutnya: string;
  Nama_Berikutnya: string;
}

export interface LiniTujuanOption {
  Kode: string;
  Nama: string;
  Default: boolean;
}

export interface LhkOption {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Jml_SPK: number;
  Jml_Belum_Mutasi: number;
}

export interface SpkDiLhk {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Jenis_Sumber: JenisSumber;
  Tgl_SPK: string | null;
  Kode_Divisi: number | null;
  Nama_Divisi: string | null;
  Kode_Jenis_Order: string | null;
  Jenis_Produk: string | null;
  Nomor_Mutasi: string | null;
  Sudah_Dimutasi: boolean;
}

export interface HasilLhk {
  Kolom: KolomDetail[];
  Baris: Record<string, NilaiDetail>[];
}

export interface MutasiProduksiSpandukForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Lini_Asal: string;
  Lini_Tujuan: string;
  Nama_Lini_Asal: string;
  Nama_Lini_Tujuan: string;
  Nomor_LHK: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Jenis_Sumber: JenisSumber;
  Tgl_SPK: string | null;
  Kode_Divisi: number | null;
  Nama_Divisi: string | null;
  Kode_Jenis_Order: string | null;
  Jenis_Produk: string | null;
  Keterangan: string;
  Tanggal_LHK: string | null;
  Detail: HasilLhk;
  Terkunci: boolean;
  Pesan_Kunci: string | null;
}

export interface MutasiProduksiSpandukPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Lini_Asal: string;
  Lini_Tujuan: string;
  Nomor_LHK: string;
  Nomor_SPK: string;
  Keterangan: string;
}

export interface SaveResponse {
  data?: { data?: { Nomor?: string } };
}

export const getLiniAsal = async (): Promise<LiniAsalOption[]> => {
  const res = await api.get<ApiResponse<LiniAsalOption[]>>(
    `${BASE}/lookups/lini-asal`,
  );
  return res.data.data;
};

export const getLiniTujuan = async (
  lini: string,
  jenis: JenisSumber,
): Promise<LiniTujuanOption[]> => {
  const res = await api.get<ApiResponse<LiniTujuanOption[]>>(
    `${BASE}/lookups/lini-tujuan`,
    { params: { lini, jenis } },
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

export const getLhk = async (
  lini: string,
  search = "",
): Promise<LhkOption[]> => {
  const res = await api.get<ApiResponse<LhkOption[]>>(`${BASE}/lookups/lhk`, {
    params: { lini, search },
  });
  return res.data.data;
};

export const getSpkDiLhk = async (
  lini: string,
  lhk: string,
): Promise<SpkDiLhk[]> => {
  const res = await api.get<ApiResponse<SpkDiLhk[]>>(
    `${BASE}/lookups/lhk-spk`,
    { params: { lini, lhk } },
  );
  return res.data.data;
};

export const getHasilLhk = async (
  lini: string,
  lhk: string,
  spk: string,
): Promise<HasilLhk> => {
  const res = await api.get<ApiResponse<HasilLhk>>(
    `${BASE}/lookups/hasil-lhk`,
    { params: { lini, lhk, spk } },
  );
  return res.data.data;
};

export const getById = async (
  nomor: string,
): Promise<MutasiProduksiSpandukForm> => {
  const res = await api.get<ApiResponse<MutasiProduksiSpandukForm>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const create = async (
  payload: MutasiProduksiSpandukPayload,
): Promise<SaveResponse> => {
  return api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);
};

export const update = async (
  nomor: string,
  payload: MutasiProduksiSpandukPayload,
): Promise<SaveResponse> => {
  return api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
};
