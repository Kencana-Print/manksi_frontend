import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-tinta";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkTintaRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Jml_SPK: number | null;
}

// Satu baris per SPK per bahan. SPK tanpa pemakaian tinta tetap muncul
// dengan Kode_Bahan/Nama_Bahan/Qty bernilai null.
export interface LhkTintaDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  Kode_Bahan: number | null;
  Nama_Bahan: string | null;
  Satuan: string | null;
  Qty: number | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkTintaRow[]> => {
  const res = await api.get<ApiResponse<LhkTintaRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkTintaDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkTintaDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
