import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/mutasi-marketing";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MutasiMarketingRow {
  Nomor: string;
  Tanggal: string;
  Lokasi: string;
  Keterangan: string;
  Jumlah_MAP: number;
  Total_Qty: number;
  MO: string;
  Jumlah_Diterima: number;
}

export interface MutasiMarketingDetailRow {
  Nomor: string;
  Nomor_MAP: string;
  Nama_MAP: string;
  Qty: number;
  MO: string;
  Tgl_Diterima: string | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<MutasiMarketingRow[]> => {
  const res = await api.get<ApiResponse<MutasiMarketingRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<MutasiMarketingDetailRow[]> => {
  const res = await api.get<ApiResponse<MutasiMarketingDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
