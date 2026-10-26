import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-lipat-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PabrikOption {
  Kode: string;
  Nama: string;
}

export interface KaryawanOption {
  NIK: string;
  Nama: string;
  Jam_Kerja: string;
}

export interface LhkLipatKaryawan {
  NIK: string;
  Nama: string | null;
  Absensi: number | null; // legacy (LHK lama)
  Qty: number | null;
  Jam_Kerja: string;
}

export interface LhkLipatDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  Qty_Lipat: number | null;
  Tambah_Lipat: number | null;
  Mata_Ayam: number | null;
  BS_Lipat: number | null;
  Karyawan: LhkLipatKaryawan[];
}

export interface LhkLipatForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Sesi: string;
  Detail: LhkLipatDetail[];
}

export interface InfoSpk {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
}

export interface LhkLipatPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Sesi: string;
  Detail: {
    Nomor_SPK: string;
    Qty_Lipat: number;
    Tambah_Lipat: number;
    Mata_Ayam: number;
    BS_Lipat: number;
    Karyawan: { NIK: string; Qty: number }[];
  }[];
}

export interface SaveResponse {
  data?: { data?: { Nomor?: string } };
}

export const getById = async (nomor: string): Promise<LhkLipatForm> => {
  const res = await api.get<ApiResponse<LhkLipatForm>>(
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

export const getLookupKaryawan = async (
  pabrik: string,
  sesi: string,
  tanggal: string,
): Promise<KaryawanOption[]> => {
  const res = await api.get<ApiResponse<KaryawanOption[]>>(
    `${BASE}/lookups/karyawan`,
    { params: { pabrik, sesi, tanggal } },
  );
  return res.data.data;
};

export const create = async (
  payload: LhkLipatPayload,
): Promise<SaveResponse> => {
  return api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);
};

export const update = async (
  nomor: string,
  payload: LhkLipatPayload,
): Promise<SaveResponse> => {
  return api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
};
