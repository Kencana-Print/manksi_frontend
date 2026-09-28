import api from "@/services/api";

export interface RekonMasterRow {
  Tanggal: string;
  Account: string;
  Nama: string;
  SaldoBuku: number;
  Tambah: number;
  Kurang: number;
  Buku: number;
  SaldoBank: number;
  Tambah_: number;
  Kurang_: number;
  Bank: number;
  Selisih: number;
}

export interface RekonDetailRow {
  Tanggal: string;
  Account: string;
  Nama: string;
  Jenis: string;
  Nomor: string;
  Keterangan: string;
  Nominal: number;
}

export const rekonsiliasiBankLaporanService = {
  getData(startDate: string, endDate: string) {
    return api.get("/laporan/finance/rekonsiliasi-bank", {
      params: { startDate, endDate },
    });
  },
};
