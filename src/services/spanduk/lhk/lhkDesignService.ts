import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-design";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkDesignRow {
  Nomor: string;
  Nama_SPK: string | null;
  Tanggal_SPK: string | null;
  Dateline: string | null;
  Tanggal_LHK: string | null;
  Status_Terakhir: string | null;
  User_Create: string | null;
}

// Kolom angka di tabel lama bisa datang sebagai angka atau string
export interface LhkDesignKomponenRow {
  Nomor: string;
  Bahan: string | null;
  Panjang_Output: number | string | null;
  Jumlah_Output: number | string | null;
  Total_Output: number | string | null;
  Tinta_C: number | string | null;
  Tinta_M: number | string | null;
  Tinta_Y: number | string | null;
  Tinta_K: number | string | null;
  Mesin: string | null;
  Keterangan: string | null;
}

export interface LhkDesignStatusRow {
  Nomor: string;
  Design: string | null;
  Status: string | null;
  Tanggal: string | null;
  Durasi: number | string | null;
  Catatan: string | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkDesignRow[]> => {
  const res = await api.get<ApiResponse<LhkDesignRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkDesignKomponenRow[]> => {
  const res = await api.get<ApiResponse<LhkDesignKomponenRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const getStatus = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkDesignStatusRow[]> => {
  const res = await api.get<ApiResponse<LhkDesignStatusRow[]>>(
    `${BASE}/status`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
