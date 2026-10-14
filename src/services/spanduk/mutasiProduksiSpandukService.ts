import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/mutasi-produksi";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MutasiProduksiSpandukRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
  Lini_Asal: string;
  Lini_Tujuan: string;
  Nama_Lini_Asal: string;
  Nama_Lini_Tujuan: string;
  Nomor_LHK: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Keterangan: string;
  User_Create: string | null;
  Tgl_Create: string | null;
}

export type NilaiDetail = string | number | null;

export interface KolomDetail {
  Key: string;
  Label: string;
}

export interface MutasiProduksiSpandukDetail {
  Nomor_LHK: string;
  Nomor_SPK: string;
  Lini_Asal: string;
  Nama_Lini_Asal: string;
  Kolom: KolomDetail[];
  Baris: Record<string, NilaiDetail>[];
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<MutasiProduksiSpandukRow[]> => {
  const res = await api.get<ApiResponse<MutasiProduksiSpandukRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  nomor: string,
): Promise<MutasiProduksiSpandukDetail> => {
  const res = await api.get<ApiResponse<MutasiProduksiSpandukDetail>>(
    `${BASE}/${encodeURIComponent(nomor)}/detail`,
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
