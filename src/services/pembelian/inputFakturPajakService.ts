import api from "@/services/api";

export type StatusFaktur = "OUTSTANDING" | "SUDAH" | "SEMUA";

export interface FakturVoucherRow {
  Nomor: string;
  Tanggal: string;
  KodeSupplier: string;
  Supplier: string;
  NomorInvoice: string;
  Ppn: number | string;
  NomorPajak: string;
  Total: number | string;
  Net: number | string;
  StatusFaktur: "OUTSTANDING" | "SUDAH";
  UmurHari: number | string;
  StatusRealisasi: string | number;
  Keterangan: string;
  TglInputFaktur: string | null;
  UserInputFaktur: string;
}

export interface SimpanFakturResult {
  nomor: string;
  nomorPajak: string;
  peringatan: string;
}

const BASE = "/pembelian/input-faktur-pajak";

export const inputFakturPajakService = {
  getBrowse: (startDate: string, endDate: string, status: StatusFaktur) =>
    api.get<{ data: FakturVoucherRow[] }>(BASE, {
      params: { startDate, endDate, status },
    }),

  simpan: (nomor: string, nomorPajak: string) =>
    api.post<{ data: SimpanFakturResult }>(`${BASE}/simpan`, {
      nomor,
      nomorPajak,
    }),
};
