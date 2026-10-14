import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-plotter";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkPlotterRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string | null;
  Nama_Pabrik: string | null;
}

export interface LhkPlotterDetailRow {
  Nomor: string;
  Nomor_SPK: string;
  Nama_SPK: string | null;
  Jumlah_Order: number | null;
  Panjang: number | null;
  Lebar: number | null;
  J_Meter: number | null;
  J_Lembar: number | null;
  J_TotalMeter: number | null;
  J_PK: number | null;
  J_MK: number | null;
  J_Tinta: number | null;
  Keterangan: string | null;
}

export const getBrowse = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkPlotterRow[]> => {
  const res = await api.get<ApiResponse<LhkPlotterRow[]>>(BASE, {
    params: { tglAwal, tglAkhir },
  });
  return res.data.data;
};

export const getDetail = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<LhkPlotterDetailRow[]> => {
  const res = await api.get<ApiResponse<LhkPlotterDetailRow[]>>(
    `${BASE}/detail`,
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};

export const remove = async (nomor: string): Promise<void> => {
  await api.delete(`${BASE}/${encodeURIComponent(nomor)}`);
};
