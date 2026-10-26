import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface OutputBySpkRow {
  Nomor: string;
  Memo: string | null;
  Tanggal: string | null;
  Deadline: string | null;
  Nama: string | null;
  Sales: string | null;
  Divisi: string | null;
  Jenis_Order: string | null;
  Status: "Open" | "Closed";
  Panjang: number;
  Lebar: number;
  Kain: string | null;
  Finishing: string | null;
  Jml_Order: number;
  Jml_Jadi: number;
  Jml_Kirim: number;
  MT01: number;
  MT02: number;
  MT03: number;
  MT04: number;
  MT05: number;
  MI: number;
  MT01_M: number;
  MT02_M: number;
  MT03_M: number;
  MT04_M: number;
  MT05_M: number;
  MI_M: number;
  Jml_Cetak: number;
  Jml_Jahit: number;
  Jml_Lipat: number;
  Jml_Koli: number;
  M_Cetak: number;
  M_Jahit: number;
  M_Lipat: number;
  M_Koli: number;
}

export const getOutputBySpk = async (
  tglAwal: string,
  tglAkhir: string,
): Promise<OutputBySpkRow[]> => {
  const res = await api.get<ApiResponse<OutputBySpkRow[]>>(
    "/laporan/spanduk/output-by-spk",
    { params: { tglAwal, tglAkhir } },
  );
  return res.data.data;
};
