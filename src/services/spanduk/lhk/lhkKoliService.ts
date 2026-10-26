import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-koli";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkKoliRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Jml_SPK: number;
  Total_Koli: number;
}

export interface LhkKoliDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Koli: number | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkKoliRow[]> => {
  const res = await api.get<ApiResponse<LhkKoliRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkKoliDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkKoliDetailRow[]>>(`${BASE}/detail`, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
