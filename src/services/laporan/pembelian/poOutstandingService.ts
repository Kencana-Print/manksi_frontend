import api from "@/services/api";

export type PoOutstandingJenisFilter = "ALL" | "BAHAN" | "NON_BAHAN";

export interface PoOutstandingRow {
  id: number;
  Tipe: "BAHAN" | "NON_BAHAN";
  Jenis: string;
  Nomor: string;
  Tanggal: string;
  Umur: number;
  KodeSupplier: string;
  Supplier: string;
  Kode: string;
  Nama: string;
  Satuan: string;
  QtyPo: number;
  QtyTerima: number;
  Sisa: number;
  Cabang: string;
  TglJanji: string | null;
  Telat: boolean;
}

export interface PoOutstandingParams {
  startDate?: string;
  endDate?: string;
  jenis?: PoOutstandingJenisFilter;
}

export const poOutstandingService = {
  getPoOutstanding(filter: PoOutstandingParams) {
    const params: Record<string, string> = {};
    if (filter.startDate) params.startDate = filter.startDate;
    if (filter.endDate) params.endDate = filter.endDate;
    if (filter.jenis) params.jenis = filter.jenis;
    return api.get("/laporan/pembelian/po-outstanding", { params });
  },
};
