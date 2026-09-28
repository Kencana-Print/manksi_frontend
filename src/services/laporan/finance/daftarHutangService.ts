import api from "@/services/api";

export interface DaftarHutangRow {
  Nomor: string;
  Tipe: string;
  Tanggal: string;
  JatuhTempo: string;
  SupKode: string;
  Nama: string;
  Total: number;
  Voucher: number;
  Bayar: number;
}

export interface DaftarHutangDetail {
  Nomor: string;
  NomorVoucher: string;
  TanggalVoucher: string;
  Total: number;
  StatusRealisasi: number;
}

export const daftarHutangService = {
  getBrowse(startDate: string, endDate: string) {
    return api.get("/laporan/finance/daftar-hutang", {
      params: { startDate, endDate },
    });
  },
  getDetail(startDate: string, endDate: string) {
    return api.get("/laporan/finance/daftar-hutang/detail", {
      params: { startDate, endDate },
    });
  },
};
