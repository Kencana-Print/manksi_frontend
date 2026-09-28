import api from "@/services/api";

export interface StokMasterRow {
  Jenis: string;
  Kode: string;
  Nama: string;
  Satuan: string;
  Stok: number;
  Mutasi: number;
  REAL_: number;
}

export interface StokDetailRow {
  Kode: string;
  Tanggal: string;
  Nomor: string;
  NoMB: string;
  Jenis: string;
  StokIn: number;
  StokOut: number;
  Selisih: number;
}

export const stokFinanceService = {
  getCabangList() {
    return api.get("/laporan/finance/stok-finance/cabang-list");
  },
  getMaster(cabang: string) {
    return api.get("/laporan/finance/stok-finance/master", {
      params: { cabang },
    });
  },
  getDetail(cabang: string) {
    return api.get("/laporan/finance/stok-finance/detail", {
      params: { cabang },
    });
  },
};
