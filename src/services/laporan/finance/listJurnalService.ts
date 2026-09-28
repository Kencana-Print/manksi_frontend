import api from "@/services/api";

export interface ListJurnalRow {
  Bulan: number;
  Tahun: number;
  Tanggal: string;
  Nomor: string;
  Referensi: string;
  Account: string;
  AccountName: string;
  Keterangan: string;
  Debet: number;
  Kredit: number;
  DetailCC: string;
}

export const listJurnalService = {
  getBrowse(startDate: string, endDate: string) {
    return api.get<{ success: boolean; data: ListJurnalRow[] }>(
      "/laporan/finance/list-jurnal",
      { params: { startDate, endDate } },
    );
  },
};
