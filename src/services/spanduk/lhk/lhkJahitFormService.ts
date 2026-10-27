import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-jahit-form";

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

export interface LhkJahitKaryawan {
  NIK: string;
  Nama: string | null;
  Absensi: number | null; // legacy (LHK lama)
  Qty: number | null;
  Jam_Kerja: string;
}

export interface LhkJahitDetail {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  Qty_Jahit: number | null;
  Tambah_Jahit: number | null;
  Tambah_Tali: number | null;
  BS_Jahit: number | null;
  Karyawan: LhkJahitKaryawan[];
}

export interface LhkJahitForm {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Legacy: boolean;
  Detail: LhkJahitDetail[];
}

export interface InfoSpk {
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
}

export interface LhkJahitPayload {
  Tanggal: string;
  Kode_Pabrik: string;
  Detail: {
    Nomor_SPK: string;
    Qty_Jahit: number;
    Tambah_Jahit: number;
    Tambah_Tali: number;
    BS_Jahit: number;
    Karyawan: { NIK: string; Qty: number }[];
  }[];
}

export interface SaveResponse {
  data?: { data?: { Nomor?: string } };
}

export const getById = async (nomor: string): Promise<LhkJahitForm> => {
  const res = await api.get<ApiResponse<LhkJahitForm>>(
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
  tanggal: string,
): Promise<KaryawanOption[]> => {
  const res = await api.get<ApiResponse<KaryawanOption[]>>(
    `${BASE}/lookups/karyawan`,
    { params: { pabrik, tanggal } },
  );
  return res.data.data;
};

export const create = async (
  payload: LhkJahitPayload,
): Promise<SaveResponse> => {
  return api.post<ApiResponse<{ Nomor: string }>>(BASE, payload);
};

export const update = async (
  nomor: string,
  payload: LhkJahitPayload,
): Promise<SaveResponse> => {
  return api.put<ApiResponse<{ Nomor: string }>>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
};
