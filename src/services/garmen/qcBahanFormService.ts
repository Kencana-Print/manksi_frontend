import api from "@/services/api";

export interface QcHasil {
  gramasi: string;
  setting: string;
  warna: string;
  handfeel: string;
  bowing: string;
  shrinkage: string;
  kelunturan: string;
}

export interface QcLotRow {
  nourut?: number;
  lot: string;
  qty_kg: number;
  qty_roll: number;
  qty_kg_po: number;
  gramasi_po: string;
  gramasi_min: number;
  gramasi_max: number;
  setting_po: string;
  warna: string;
  gramasi_cek: number;
  setting_cek: string;
  nilai: number;
  nilai_saran: number;
  alasan_nilai: string;
  keputusan: string;
  hasil: QcHasil;
}

export interface QcHeader {
  qc_nomor: string;
  qc_tgl_datang: string;
  qc_po_nomor: string;
  qc_bhn_kode: string;
  qc_pod_nourut: number;
  qc_vendor_greige: string;
  qc_jenis_kain: string;
  qc_vendor_celup: string;
  qc_status: string;
  qc_keterangan: string;
  jenis_po?: string;
  user_create?: string;
  date_create?: string;
}

export interface QcPoInfo {
  qty: number;
  roll: number;
  satuan: string;
  gramasi: string;
  gramasi_min: number;
  gramasi_max: number;
  setting: string;
  warna: string;
}

export interface QcFormData {
  header: QcHeader;
  dtl: QcLotRow[];
  po: QcPoInfo;
  toleransi: number;
}

export interface QcDetailResponse {
  header: QcHeader;
  dtl: QcLotRow[];
  po: { qty: number; roll: number; satuan: string } | null;
  toleransi: number;
  pengesah: {
    pembelian: string;
    tgl_pembelian: string;
  };
}

export interface QcPoSource {
  header: Pick<
    QcHeader,
    | "qc_po_nomor"
    | "qc_bhn_kode"
    | "qc_pod_nourut"
    | "qc_vendor_greige"
    | "qc_vendor_celup"
    | "qc_jenis_kain"
    | "jenis_po"
  >;
  po: QcPoInfo;
  toleransi: number;
}

export interface QcLampiran {
  Id: number;
  Jenis: "BAHAN" | "TRIMCARD";
  File: string;
  Nama: string;
}

export interface QcPoLookupItem {
  PO: string;
  JenisPO: string;
  TanggalPO: string;
  Supplier: string;
  Nourut: number;
  KodeBahan: string;
  NamaKain: string;
  Gramasi: string;
  Setting: string;
  Roll: number;
  Qty: number;
  Satuan: string;
  QcCount: number;
}

export interface QcSaveLot {
  lot: string;
  qty_kg: number;
  qty_roll: number;
  warna: string;
  gramasi_cek: number;
  setting_cek: string;
  nilai: number;
  alasan_nilai: string;
  hasil: QcHasil;
}

export interface QcSavePayload {
  isEdit: boolean;
  qc_nomor: string;
  qc_po_nomor: string;
  qc_pod_nourut: number;
  qc_tgl_datang: string;
  qc_keterangan: string;
  submit: boolean;
  dtl: QcSaveLot[];
}

export interface QcSaveResult {
  qc_nomor: string;
  status: string;
  warnings: string[];
}

const BASE = "/garmen/bahan-baku/qc-bahan/form";

export const qcBahanFormService = {
  lookupPo: (params: { startDate: string; endDate: string; search: string }) =>
    api.get(`${BASE}/lookup-po`, { params }),

  getPoSource: (po: string, nourut: number) =>
    api.get(`${BASE}/po-source`, { params: { po, nourut } }),

  getDetail: (nomor: string) =>
    api.get(`${BASE}/detail`, { params: { nomor } }),

  getLampiran: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/qc-bahan/form/lampiran/${encodeURIComponent(nomor)}`,
    ),

  uploadLampiran: (nomor: string, jenis: string, file: File) => {
    const fd = new FormData();
    fd.append("jenis", jenis);
    fd.append("file", file);
    return api.post(
      `/garmen/bahan-baku/qc-bahan/form/lampiran/${encodeURIComponent(nomor)}`,
      fd,
    );
  },

  deleteLampiran: (nomor: string, jenis: string) =>
    api.delete(
      `/garmen/bahan-baku/qc-bahan/form/lampiran/${encodeURIComponent(nomor)}/${jenis}`,
    ),

  save: (payload: QcSavePayload) => api.post(`${BASE}/save`, payload),
};
