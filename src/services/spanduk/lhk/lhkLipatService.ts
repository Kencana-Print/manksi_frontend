import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-lipat";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkLipatRow {
  Nomor: string;
  Tanggal: string;
  Sesi: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
}

export interface LhkLipatDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  Qty_Lipat: number | null;
  Tambah_Lipat: number | null;
  Mata_Ayam: number | null;
  BS_Lipat: number | null;
}

export interface LhkLipatKaryawanRow {
  Nomor: string;
  Nomor_SPK: string;
  NIK: string;
  Nama: string | null;
  Absensi: number | null; // legacy (LHK lama)
  Qty: number | null;
  Menit_Kerja: number;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkLipatRow[]> => {
  const res = await api.get<ApiResponse<LhkLipatRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkLipatDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkLipatDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const getKaryawan = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkLipatKaryawanRow[]> => {
  const res = await api.get<ApiResponse<LhkLipatKaryawanRow[]>>(
    `${BASE}/karyawan`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data ?? [];
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
