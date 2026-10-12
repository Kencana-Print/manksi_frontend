import api from "@/services/api";

const BASE_QC = "/garmen/bahan-baku/retur-pembelian-bahan-qc";

export interface ReturBrowseParams {
  startDate: string;
  endDate: string;
}

export interface QcSiapRow {
  Nomor: string;
  TglDatang: string;
  Nomor_PO: string;
  JenisKain: string;
  Supplier: string | null;
  LotReject: number;
  SisaQty: number;
  Satuan: string;
}

export interface QcRejectLot {
  Nourut: number;
  Lot: string;
  Kode: string;
  Nama: string;
  Satuan: string;
  Warna: string;
  Qty: number;
  Roll: number;
  QtyRetur: number;
  RollRetur: number;
  SisaQty: number;
  SisaRoll: number;
}

export interface QcRejectHeader {
  qcNomor: string;
  noPo: string;
  jenisKain: string;
  supKode: string;
  supNama: string;
  supAlamat: string;
}

export interface QcReturRow {
  lot: string;
  qty: number;
  roll: number;
}

export interface QcReturPayload {
  tanggal: string;
  qcNomor: string;
  noSj: string;
  keterangan: string;
  rows: QcReturRow[];
}

export interface QcReturFormHeader {
  nomor: string;
  tanggal: string;
  qcNomor: string;
  noPo: string;
  jenisKain: string;
  noSj: string;
  keterangan: string;
  supKode: string;
  supNama: string;
  supAlamat: string;
}

export interface QcReturFormData {
  header: QcReturFormHeader;
  lots: QcRejectLot[];
  rows: QcReturRow[];
}

export const returBeliBahanService = {
  getBrowse: (params: ReturBrowseParams) =>
    api.get("/garmen/bahan-baku/retur-pembelian-bahan", { params }),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/retur-pembelian-bahan/detail/${encodeURIComponent(nomor)}`,
    ),

  delete: (nomor: string) =>
    api.delete(
      `/garmen/bahan-baku/retur-pembelian-bahan/delete/${encodeURIComponent(nomor)}`,
    ),

  getDataCetak: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/retur-pembelian-bahan/cetak/${encodeURIComponent(nomor)}`,
    ),

  // --- Retur dari QC Reject ---
  qcSiap: () => api.get(`${BASE_QC}/qc-siap`),

  getLotReject: (qcNomor: string) =>
    api.get(`${BASE_QC}/lot`, { params: { qcNomor } }),

  getQcFormData: (nomor: string) =>
    api.get(`${BASE_QC}/${encodeURIComponent(nomor)}`),

  createQc: (payload: QcReturPayload) => api.post(BASE_QC, payload),

  updateQc: (nomor: string, payload: QcReturPayload) =>
    api.put(`${BASE_QC}/${encodeURIComponent(nomor)}`, payload),
};
