import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";

const BASE = "/garmen/permintaan-pembelian-bahan";

export interface PermintaanPembelianBahanBrowseItem {
  Nomor: string;
  Tanggal: string;
  Keterangan: string | null;
  Cab: string;
  Bagian: string;
  Usr: string;
  Created: string | null;
  Modified: string | null;
  Status: string;
  JmlItem: number;
}

export interface PermintaanPembelianBahanDetailRow {
  Nomor: string;
  Kode: string;
  Nama: string;
  Setting: string;
  Satuan: string;
  Jumlah: number | string;
  Keterangan: string | null;
  Dipesan: number | string;
  Sisa: number | string;
  PO: string;
}

export interface PermintaanPembelianBahanBrowseParams {
  startDate: string;
  endDate: string;
  cabang?: string;
}

export interface PermintaanPembelianBahanDetailExportRow extends PermintaanPembelianBahanDetailRow {
  Tanggal: string;
  Cab: string;
  Status: string;
}

export interface PermintaanPembelianBahanPrintHeader {
  Nomor: string;
  Tanggal: string;
  Keterangan: string | null;
  Cabang: string;
  Bagian: string;
  Status: string;
  Pembuat: string;
}

export interface PermintaanPembelianBahanPrintDetail {
  Kode: string;
  Nama: string;
  Setting: string;
  Konstruksi: string;
  Panjang: number | string | null;
  Lebar: number | string | null;
  Satuan: string;
  Jumlah: number | string;
  Keterangan: string | null;
}

export interface PermintaanPembelianBahanPrintData {
  header: PermintaanPembelianBahanPrintHeader;
  details: PermintaanPembelianBahanPrintDetail[];
}

export const permintaanPembelianBahanService = {
  getBrowse: (params: PermintaanPembelianBahanBrowseParams) =>
    api.get<ApiResult<PermintaanPembelianBahanBrowseItem[]>>(BASE, { params }),

  getDetail: (nomor: string) =>
    api.get<ApiResult<PermintaanPembelianBahanDetailRow[]>>(
      `${BASE}/${encodeURIComponent(nomor)}/detail`,
    ),

  getPrintData: (nomor: string) =>
    api.get<{ success: boolean; data: PermintaanPembelianBahanPrintData }>(
      `/garmen/permintaan-pembelian-bahan/${encodeURIComponent(nomor)}/print`,
    ),

  getDetailRange: (params: PermintaanPembelianBahanBrowseParams) =>
    api.get<ApiResult<PermintaanPembelianBahanDetailExportRow[]>>(
      `${BASE}/detail`,
      { params },
    ),

  deleteData: (nomor: string) =>
    api.delete<ApiResult<null>>(`${BASE}/${encodeURIComponent(nomor)}`),

  closeData: (nomor: string, alasan: string) =>
    api.post<{ success: boolean; message: string }>(
      `/garmen/permintaan-pembelian-bahan/${encodeURIComponent(nomor)}/close`,
      { alasan },
    ),
};
