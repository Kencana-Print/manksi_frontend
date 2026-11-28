import api from "@/services/api";

export type RekapTahapFilter =
  | "ALL"
  | "BELUM_VOUCHER"
  | "BELUM_DIAJUKAN"
  | "BELUM_REALISASI";

export interface RekapBelumRealisasiRow {
  id: string;
  NomorRekap: string;
  TglRekap: string;
  NoUrut: number;
  TahapKode: Exclude<RekapTahapFilter, "ALL">;
  Tahap: string;
  KodeSupplier: string;
  Supplier: string;
  Kategori: string;
  Tipe: string;
  Nota: string;
  TglNota: string | null;
  BulanTagihan: string;
  Nominal: number;
  TglRencana: string | null;
  Telat: boolean;
  Voucher: string;
  Pjt: string;
  Keterangan: string;
}

export interface RekapBelumRealisasiParams {
  startDate?: string;
  endDate?: string;
  tahap?: RekapTahapFilter;
}

export const rekapBelumRealisasiService = {
  getRekapBelumRealisasi(filter: RekapBelumRealisasiParams) {
    const params: Record<string, string> = {};
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.tahap) params.tahap = filter.tahap;
    return api.get("/laporan/pembelian/rekap-belum-realisasi", { params });
  },
};
