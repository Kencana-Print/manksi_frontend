import api from "@/services/api";

const BASE = "/pembelian/tindak-lanjut-qc";

export interface TlQcLot {
  Nourut: number;
  Lot: string;
  Kg: number;
  Satuan: string;
  Roll: number;
  Warna: string;
  GramasiPO: string;
  SettingPO: string;
  GramasiCek: number;
  SettingCek: string;
  Nilai: number;
  Saran: number;
  AlasanNilai: string;
  Keputusan: string;
  KeputusanOleh: string;
  KeputusanTgl: string | null;
  KeputusanCatatan: string;
  KlienKontak: string;
  SudahBpb: number;
  QtyRetur: number;
  KeputusanTahap: string;
}

export interface TlQcRiwayat {
  Id: number;
  Lot: string;
  Tahap: string;
  Keputusan: string;
  Catatan: string;
  KlienKontak: string;
  Usr: string;
  Tanggal: string;
}

export interface TlQcKeputusanItem {
  nourut: number;
  keputusan: string;
  catatan: string;
}

export interface TlQcKeputusanPayload {
  kontak: string;
  items: TlQcKeputusanItem[];
}

export interface TlQcBrowseParams {
  startDate: string;
  endDate: string;
  status: string;
}

export const tindakLanjutQcService = {
  getBrowse: (params: TlQcBrowseParams) =>
    api.get(`${BASE}/browse`, { params }),

  getDetailLot: (nomor: string) =>
    api.get(`${BASE}/lot/${encodeURIComponent(nomor)}`),

  getRiwayat: (nomor: string) =>
    api.get(`${BASE}/riwayat/${encodeURIComponent(nomor)}`),

  saveKeputusan: (nomor: string, payload: TlQcKeputusanPayload) =>
    api.post(`${BASE}/keputusan/${encodeURIComponent(nomor)}`, payload),

  requestPin: (payload: { nomor: string; alasan: string }) =>
    api.post(`${BASE}/request-pin`, payload),
};
