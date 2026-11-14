// services/laporan/spanduk/pemakaianBahanService.ts
import api from "@/services/api";

export interface PemakaianBahanGudang {
  kode: string;
  nama: string;
}

export interface PemakaianBahanRow {
  Kunci: string;
  Tanggal: string;
  Nomor_LHK: string;
  Sesi: number | string;
  Kode_Pabrik: string;
  Kode_Bahan: string;
  Kode_Supplier: string;
  Nama_Bahan: string;
  Nama_Supplier: string;
  Konstruksi: string;
  Satuan: string;
  Lebar: number | null;
  Qty_Meter: number;
  Gudang: Record<string, number>; // kode gudang -> saldo akhir periode (bukan pemakaian)
}

export interface PemakaianBahanData {
  rows: PemakaianBahanRow[];
  gudang: PemakaianBahanGudang[];
}

const BASE = "/laporan/spanduk/pemakaian-bahan";

export const pemakaianBahanService = {
  getBrowse: (params: { tglAwal: string; tglAkhir: string }) =>
    api.get<{ success: boolean; data: PemakaianBahanData }>(BASE, { params }),
};
