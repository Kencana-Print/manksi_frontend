import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/penjualan/terima-mutasi";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface TerimaMutasiRow {
  Nomor_Mutasi: string;
  Tanggal_Mutasi: string;
  Lokasi: string;
  Keterangan: string;
  Jumlah_MAP: number;
  Total_Kirim: number;
  MO: string;
  Nomor_Terima: string;
  Tanggal_Terima: string | null;
  Total_Terima: number | null;
  Status: "BELUM" | "SUDAH";
}

export interface TerimaMutasiDetailRow {
  Nomor_Mutasi: string;
  Nomor_MAP: string;
  Nama_MAP: string;
  Ukuran: string;
  Qty_Kirim: number;
  Qty_Terima: number | null;
  MO: string;
}

export interface TerimaMutasiPayload {
  mutasi: string;
  tanggal: string;
  keterangan: string;
  maps: { nomor: string; qtyTerima: number }[];
}

export interface SaveResponse {
  success: boolean;
  message?: string;
  data?: { nomor: string };
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<TerimaMutasiRow[]> => {
  const res = await api.get<ApiResponse<TerimaMutasiRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<TerimaMutasiDetailRow[]> => {
  const res = await api.get<ApiResponse<TerimaMutasiDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const terima = async (
  payload: TerimaMutasiPayload,
): Promise<SaveResponse> => {
  const res = await api.post<SaveResponse>(BASE, payload);
  return res.data;
};

export const remove = async (nomorTerima: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomorTerima)}`);
};
