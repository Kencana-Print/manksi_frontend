import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/bast-map";

export interface BastMapRow {
  Nomor: string;
  Tipe: string | null;
  Tanggal: string;
  CetakBAST: string;
  NamaPekerjaan: string | null;
  NamaExt: string | null;
  Ukuran: string | null;
  Keterangan: string | null;
  kendalaProduksi: string | null;
  Jumlah: number | null;
  OnProgres: string | null;
  SemuaN: number;
  Keputusan: string | null;
  AlasanKeputusan: string | null;
  NomorProof: string | null;
  HariBAST: number | null;
}

export interface BastMapFilter {
  startDate: string;
  endDate: string;
  onProgressOnly: boolean;
}

export const bastMapSpandukService = {
  getBrowse: (params: BastMapFilter) =>
    api.get<{ data: BastMapRow[] }>(BASE, { params }),
  remove: (nomor: string) =>
    api.delete<{ message: string }>(`${BASE}/${encodeURIComponent(nomor)}`),
};
