import api from "@/services/api";

export interface BukuBesarRow {
  id: number;
  Tanggal: string;
  Nomor: string;
  Trs: string;
  Nota: string;
  Penerima: string;
  Keterangan: string;
  Debet: number;
  Kredit: number;
  Saldo: number;
  Account: string;
  NamaAccount: string;
  TglTransfer: string | null;
}

export interface AccountItem {
  kode: string;
  nama: string;
}

export const bukuBesarService = {
  getDefaultAccount(cabang: string) {
    return api.get("/laporan/finance/buku-besar/default-account", {
      params: { cabang },
    });
  },
  searchAccount(cabang: string, search = "") {
    return api.get("/laporan/finance/buku-besar/account-options", {
      params: { cabang, search },
    });
  },
  getAccountByKode(kode: string) {
    return api.get(
      `/laporan/finance/buku-besar/account/${encodeURIComponent(kode)}`,
    );
  },
  getBukuBesar(rekkode: string, startDate: string, endDate: string) {
    return api.get("/laporan/finance/buku-besar", {
      params: { rekkode, startDate, endDate },
    });
  },
};
