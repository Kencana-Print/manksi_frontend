import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-cetak";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Jml_Meter hasil SUM() bisa berupa string desimal dari driver MySQL
export interface LhkCetakRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Kar_Borongan: number | null;
  Kar_Harian: number | null;
  Jml_Meter: number | string | null;
  // NULL = LHK belum punya baris kain
  Jml_Kain: number | string | null;
  Sesi: string;
}

export interface LhkCetakDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  Qty_Cetak: number | null;
  Jml_Plangkan: number | null;
}

export interface LhkCetakKainRow {
  Nomor: string;
  Kode_Bahan: number | string;
  Nama_Bahan: string | null;
  Lebar: string | null;
  Qty_Meter: number | string;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkCetakRow[]> => {
  const res = await api.get<ApiResponse<LhkCetakRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkCetakDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkCetakDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const getKain = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkCetakKainRow[]> => {
  const res = await api.get<ApiResponse<LhkCetakKainRow[]>>(`${BASE}/kain`, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
