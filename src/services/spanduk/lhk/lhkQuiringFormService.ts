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
  J_Oven: number | null;
  J_Jemuran: number | null;
  J_Potong: number | null;
}

// Karyawan tersimpan di LHK (jam kerja = snapshot saat disimpan)
export interface KaryawanForm {
  Nik: string;
  Nama: string | null;
  Menit_Kerja: number;
  Menit_Lembur: number;
  Jam_Kerja: string;
  Jam_Lembur: string;
}

// Karyawan yang memenuhi syarat sesi pada tanggal tertentu (pratinjau jam kerja)
export interface KaryawanOption {
  Nik: string;
  Nama: string;
  Jam_Masuk: string;
  Jam_Pulang: string;
  Menit_Kerja: number;
  Menit_Lembur: number;
  Jam_Kerja: string;
  Jam_Lembur: string;
}

export interface LhkQuiringForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Sesi: string | null; // '' = LHK lama (sebelum ada sesi)
  Jam_Input: string | null;
  Detail: LhkQuiringDetail[];
  Karyawan: KaryawanForm[];
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
  Sesi: string;
  Detail: {
    Nomor_SPK: string;
    J_Oven: number;
    J_Jemuran: number;
    J_Potong: number;
  }[];
  Karyawan: { Nik: string }[];
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
