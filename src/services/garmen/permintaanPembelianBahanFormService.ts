import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";
import type { PermintaanPembelianBahanDetailRow } from "@/services/garmen/permintaanPembelianBahanService";

const BASE = "/garmen/permintaan-pembelian-bahan-form";

export interface PermintaanPembelianBahanLoaded {
  header: {
    Nomor: string;
    Tanggal: string;
    Keterangan: string | null;
    Cab: string;
    Bagian: string;
    Status: string;
  };
  detail: PermintaanPembelianBahanDetailRow[];
}

export interface PermintaanPembelianBahanPayloadItem {
  kode: string;
  jumlah: number;
  keterangan: string;
}

export interface PermintaanPembelianBahanPayload {
  tanggal: string;
  keterangan: string;
  items: PermintaanPembelianBahanPayloadItem[];
}

export const permintaanPembelianBahanFormService = {
  getDetail: (nomor: string) =>
    api.get<ApiResult<PermintaanPembelianBahanLoaded>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
    ),

  save: (payload: PermintaanPembelianBahanPayload) =>
    api.post<ApiResult<{ nomor: string }>>(BASE, payload),

  update: (nomor: string, payload: PermintaanPembelianBahanPayload) =>
    api.put<ApiResult<{ nomor: string }>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
      payload,
    ),
};
