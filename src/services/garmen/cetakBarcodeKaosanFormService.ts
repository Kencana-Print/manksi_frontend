import api from "@/services/api";

const BASE = "/garmen/bahan-jadi/cetak-barcode-kaosan/form";

export interface BarcodeDetailPayload {
  kode: string;
  kodek: string;
  tglspk: string;
  barcode: string;
  nama: string;
  ukuran: string;
  order: number;
  harga: number;
  awal: number;
  akhir: number;
  jumlah: number;
  good: number;
  bsA: number;
  bsB: number;
  bsC: number;
  cetak: boolean;
  packing: string;
  sudahCetak?: number;
}

export interface SaveBarcodePayload {
  isEdit: boolean;
  nomor: string;
  tanggal: string;
  cab: string;
  bs: boolean;
  detail: BarcodeDetailPayload[];
}

export interface PreviewBarcodePayload {
  nomor: string;
  tanggal: string;
  bs: boolean;
  detail: BarcodeDetailPayload[];
}

export const cetakBarcodeKaosanFormService = {
  getDetail: (nomor: string) =>
    api.get(`${BASE}/${encodeURIComponent(nomor)}/detail`),
  lookupSpk: (nomor: string) =>
    api.get(`${BASE}/lookup-spk/${encodeURIComponent(nomor)}`),
  lookupKodeKaosan: (kode: string) =>
    api.get(`${BASE}/lookup-kaosan/${encodeURIComponent(kode)}`),
  lookupByBarcode: (barcode: string) =>
    api.get(`${BASE}/lookup-barcode/${encodeURIComponent(barcode)}`),
  searchKaosanMaster: (q: string, limit = 50) =>
    api.get(`${BASE}/search-kaosan-master`, { params: { q, limit } }),
  previewPrint: (payload: PreviewBarcodePayload) =>
    api.post(`${BASE}/preview-print`, payload),
  save: (payload: SaveBarcodePayload) =>
    payload.isEdit
      ? api.put(`${BASE}/save`, payload)
      : api.post(`${BASE}/save`, payload),
};
