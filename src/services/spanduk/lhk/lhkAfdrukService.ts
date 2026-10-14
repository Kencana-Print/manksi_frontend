import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-afdruk";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkAfdrukRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Kar_Borongan: number | null;
  Kar_Harian: number | null;
}

export interface LhkAfdrukDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Plangkan: number | null;
  Ulano: number | null;
  Screen: number | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkAfdrukRow[]> => {
  const res = await api.get<ApiResponse<LhkAfdrukRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkAfdrukDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkAfdrukDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
