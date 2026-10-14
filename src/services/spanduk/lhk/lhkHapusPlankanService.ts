import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-hapus-plankan";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkHapusPlankanRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
}

export interface LhkHapusPlankanDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Plangkan: number | null;
  J_Meter: number | null;
  Ukuran: number | null;
  Jumlah_Meter: number | null;
  Rinso: number | null;
  Porstek: number | null;
  M46: number | null;
  Kaporit: number | null;
  Caustik: number | null;
  Keterangan: string | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkHapusPlankanRow[]> => {
  const res = await api.get<ApiResponse<LhkHapusPlankanRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkHapusPlankanDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkHapusPlankanDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
