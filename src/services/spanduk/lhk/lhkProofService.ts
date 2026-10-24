import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-proof";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkProofRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
}

export interface LhkProofDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Plangkan: number | null;
  J_Proof: number | null;
  J_Meter: number | null;
  U1: string | null;
  U2: string | null;
  U3: string | null;
  U4: string | null;
  U5: string | null;
  U6: string | null;
  U7: string | null;
  U8: string | null;
  U9: string | null;
  U10: string | null;
}

export interface LhkProofResepRow {
  Nomor: string;
  Kode: number;
  Nama: string;
  Satuan: string;
  Qty_Resep: number;
  Qty_Actual: number;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkProofRow[]> => {
  const res = await api.get<ApiResponse<LhkProofRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkProofDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkProofDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const getResep = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkProofResepRow[]> => {
  const res = await api.get<ApiResponse<LhkProofResepRow[]>>(`${BASE}/resep`, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data ?? [];
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
