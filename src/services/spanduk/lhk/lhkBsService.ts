import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-bs";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkBsRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Total_BS: number;
}

export interface LhkBsDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  BS_Quiring: number | null;
  BS_Cetak: number | null;
  BS_Bahan: number | null;
  BS_Jahit: number | null;
  BS_Lipat: number | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkBsRow[]> => {
  const res = await api.get<ApiResponse<LhkBsRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkBsDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkBsDetailRow[]>>(`${BASE}/detail`, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
