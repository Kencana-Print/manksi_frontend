import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-quiring";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkQuiringRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
}

export interface LhkQuiringDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Oven: number | null;
  J_Jemuran: number | null;
  J_Potong: number | null;
  BS_Quiring: number | null;
  BS_Cetak: number | null;
  BS_Bahan: number | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkQuiringRow[]> => {
  const res = await api.get<ApiResponse<LhkQuiringRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkQuiringDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkQuiringDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
