import api from "@/services/api";

export interface DivisiOption {
  kode: string | number;
  nama: string;
}

export interface BiayaDetailItem {
  noPengajuan: string;
  tanggalPengajuan: string;
  noBkkBbk: string;
  tanggalBkkBbk: string;
  detailCC: string;
  uraian: string;
  nominal: number;
}

export interface AkunItem {
  rekKode: string;
  namaAkun: string;
  totalNominal: number;
  detail: BiayaDetailItem[];
}

export interface BiayaPerDivisiData {
  divisi: { kode: string | number; nama: string };
  akunList: AkunItem[];
  grandTotal: number;
}

export const biayaPerDivisiService = {
  getListDivisi() {
    return api.get("/laporan/finance/biaya-per-divisi/divisi-options");
  },
  getBiayaPerDivisi(
    cckode: string | number,
    startDate: string,
    endDate: string,
  ) {
    return api.get("/laporan/finance/biaya-per-divisi", {
      params: { cckode, startDate, endDate },
    });
  },
};
