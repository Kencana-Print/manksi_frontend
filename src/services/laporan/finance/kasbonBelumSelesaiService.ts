import api from "@/services/api";

export interface KasbonMasterRow {
  Nomor: string;
  Tanggal: string;
  Jenis: string;
  Pjh: string;
  Nota: string;
  Penerima: string;
  Nominal: number;
  Keterangan: string;
}

export interface KasbonDetailRow {
  Nomor: string;
  Uraian: string;
  Satuan: string;
  Qty: number;
  Nominal: number;
  Total: number;
  Kegunaan: string;
  Keterangan: string;
}

export interface AccountItem {
  kode: string;
  nama: string;
}

export const kasbonBelumSelesaiService = {
  getDefaultAccount(cabang: string) {
    return api.get("/laporan/finance/kasbon-belum-selesai/default-account", {
      params: { cabang },
    });
  },
  searchAccount(cabang: string, search = "") {
    return api.get("/laporan/finance/kasbon-belum-selesai/account-options", {
      params: { cabang, search },
    });
  },
  getAccountByKode(kode: string) {
    return api.get(
      `/laporan/finance/kasbon-belum-selesai/account/${encodeURIComponent(kode)}`,
    );
  },
  getData(rekkode: string) {
    return api.get("/laporan/finance/kasbon-belum-selesai", {
      params: { rekkode },
    });
  },
};
