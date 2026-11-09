import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-tinta";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkTintaRow {
  Kunci: string; // nomor Tinta, atau 'CETAK:<nomor LHK Cetak>' untuk baris merah
  Nomor: string | null; // null = baris merah
  Tanggal: string | null;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Nomor_Cetak: string | null;
  Tanggal_Cetak: string | null;
  Jml_SPK: number | null;
  Jml_Bahan: number | null;
  Outstanding: number; // 1 = LHK Cetak belum punya LHK Pemakaian Obat
  Lewat_Batas: number; // lihat statusTeks di view
}

// Satu baris per LHK per obat
export interface LhkTintaDetailRow {
  Nomor: string;
  Tanggal: string;
  Nomor_Cetak: string | null;
  Kode_Bahan: string;
  Nama_Bahan: string | null;
  Qty: number; // total dalam satuan master
  Satuan: string | null;
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
