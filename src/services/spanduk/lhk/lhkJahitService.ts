import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-jahit";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkJahitRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
}

export interface LhkJahitDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  Qty_Jahit: number | null;
  Tambah_Jahit: number | null;
  Tambah_Tali: number | null;
  BS_Jahit: number | null;
}

export interface LhkJahitKaryawanRow {
  Nomor: string;
  Nomor_SPK: string;
  NIK: string;
  Nama: string | null;
  Absensi: number | null; // legacy (LHK lama)
  Qty: number | null;
  Menit_Kerja: number;
  Legacy: boolean;
}

export const getKaryawan = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkJahitKaryawanRow[]> => {
  const res = await api.get<ApiResponse<LhkJahitKaryawanRow[]>>(
    `${BASE}/karyawan`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data ?? [];
};

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkJahitRow[]> => {
  const res = await api.get<ApiResponse<LhkJahitRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkJahitDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkJahitDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
