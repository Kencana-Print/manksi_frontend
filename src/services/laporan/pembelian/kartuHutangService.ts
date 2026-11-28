import api from "@/services/api";

export interface KartuHutangMasterRow {
  id: string;
  KodeSupplier: string;
  Supplier: string;
  JmlNota: number;
  Total: number;
  Voucher: number;
  Bayar: number;
  BelumVoucher: number;
  Sisa: number;
}

export interface KartuHutangNotaRow {
  id: string;
  Nomor: string;
  Tipe: string;
  Tanggal: string;
  JatuhTempo: string | null;
  KodeSupplier: string;
  Supplier: string;
  Total: number;
  Voucher: number;
  Bayar: number;
  BelumVoucher: number;
  Sisa: number;
}

export interface KartuHutangVoucherRow {
  id: string;
  Nomor: string;
  NomorVoucher: string;
  TanggalVoucher: string;
  Total: number;
  StatusRealisasi: string | number | null;
}

export interface KartuHutangRange {
  startDate: string;
  endDate: string;
}

// Tipe dari Daftar Hutang = awalan nomor nota. Nama lengkap disamakan dengan
// pilihan tipe di VoucherPembayaranFormView. Tipe yang belum terdaftar tampil kodenya.
const TIPE_NOTA_LABEL: Record<string, string> = {
  PBG: "BPB Bahan",
  BJG: "BPB Jasa",
  MMT: "BPB MMT",
  BPE: "BPB PO Ext MMT",
  BPG: "BPB Non Bahan",
  POB: "PO Bahan",
  RTG: "Retur Pembelian",
  PJG: "Potongan Jasa",
  POE: "PO External",
};

export const tipeNotaLabel = (kode: string) => TIPE_NOTA_LABEL[kode] ?? kode;

const BASE = "/laporan/pembelian/kartu-hutang";

export const kartuHutangService = {
  getMaster: (
    params: KartuHutangRange & { supplier?: string; hanyaSisa?: boolean },
  ) =>
    api.get<{ success: boolean; data: KartuHutangMasterRow[] }>(BASE, {
      params: { ...params, hanyaSisa: params.hanyaSisa ? "1" : undefined },
    }),
  getNota: (params: KartuHutangRange & { supKode: string }) =>
    api.get<{ success: boolean; data: KartuHutangNotaRow[] }>(`${BASE}/nota`, {
      params,
    }),
  getVoucher: (params: KartuHutangRange & { nomor: string }) =>
    api.get<{ success: boolean; data: KartuHutangVoucherRow[] }>(
      `${BASE}/voucher`,
      { params },
    ),
};
