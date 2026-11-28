import api from "@/services/api";

export interface RekapHutangRow {
  id: string;
  Kode: string;
  Supplier: string;
  TahunLalu: number;
  GrandTotal: number;
  // kolom bulan dinamis: Jan..Des
  [bulan: string]: string | number;
}

export interface RekapHutangDetailRow {
  id: string;
  Nomor: string;
  Tipe: string;
  Tanggal: string;
  JatuhTempo: string | null;
  Total: number;
  Bayar: number;
  Sisa: number;
}

export interface RekapHutangDetailSemuaRow extends RekapHutangDetailRow {
  KodeSupplier: string;
  Supplier: string;
}

const BASE = "/laporan/pembelian/rekap-hutang";

export const rekapHutangService = {
  getBrowse: (params: { endDate: string }) =>
    api.get<{ success: boolean; data: RekapHutangRow[] }>(BASE, { params }),
  getDetail: (params: { supKode: string; endDate: string }) =>
    api.get<{ success: boolean; data: RekapHutangDetailRow[] }>(
      `${BASE}/detail`,
      {
        params,
      },
    ),
  getDetailSemua: (params: { endDate: string }) =>
    api.get<{ success: boolean; data: RekapHutangDetailSemuaRow[] }>(
      `${BASE}/detail-semua`,
      { params },
    ),
};
