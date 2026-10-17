import api from "@/services/api";

export interface QcRollHasil {
  gramasi: string;
  setting: string;
  warna: string;
  handfeel: string;
  bowing: string;
  shrinkage: string;
  kelunturan: string;
}

export interface QcRollRow {
  no_roll: string;
  qty: number;
  gramasi_atas: number;
  gramasi_bawah: number;
  setting_cek: number;
  sesuai: boolean;
  nilai?: number;
  catatan: string;
  hasil: QcRollHasil;
}

export interface QcLotRow {
  nourut?: number;
  lot: string;
  qty_kg: number;
  qty_roll: number;
  roll_cek: number;
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
  rolls: QcRollRow[];
}

export interface QcFormHeader {
  qc_nomor: string;
  qc_tgl_datang: string;
  qc_po_nomor: string;
  qc_bhn_kode: string;
  qc_pod_nourut: number;
  qc_vendor_greige: string;
  qc_jenis_kain: string;
  qc_vendor_celup: string;
  qc_qty_datang: number;
  qc_jml_lot: number;
  qc_jenis_cek: string;
  qc_persen_cek: number;
  qc_status: string;
  qc_keterangan: string;
  jenis_po: string;
}

export interface QcPoInfo {
  qty: number;
  sisa: number;
  roll: number;
  satuan: string;
  gramasi: string;
  gramasi_min: number;
  gramasi_max: number;
  setting: string;
  setting_min: number;
  setting_max: number;
  spec_terbaca: boolean;
  warna: string;
}

export interface QcToleransi {
  gramasi: number;
  setting: number;
  warna_nilai3: number;
  warna_nilai2: number;
}

export interface QcFormData {
  header: QcFormHeader;
  dtl: QcLotRow[];
  po: QcPoInfo;
  toleransi: QcToleransi;
}

export interface QcDetailResponse {
  header: Omit<QcFormHeader, "jenis_po"> & {
    user_create?: string;
    date_create?: string;
    qc_versi_nilai?: number;
  };
  dtl: QcLotRow[];
  po: Omit<QcPoInfo, "gramasi" | "setting" | "warna"> | null;
  pengesah: { pembelian: string; tgl_pembelian: string };
  toleransi: QcToleransi;
}

export interface QcPoSource {
  header: Pick<
    QcFormHeader,
    | "qc_po_nomor"
    | "qc_bhn_kode"
    | "qc_pod_nourut"
    | "qc_vendor_greige"
    | "qc_vendor_celup"
    | "qc_jenis_kain"
    | "qc_jenis_cek"
    | "qc_persen_cek"
    | "jenis_po"
  >;
  po: QcPoInfo;
  toleransi: QcToleransi;
}

export interface QcSaveResult {
  qc_nomor: string;
  status: string;
  warnings: string[];
  lot_lanjut: number;
  lot_pembelian: number;
}

export interface QcSaveRoll {
  no_roll: string;
  qty: number;
  gramasi_atas: number;
  gramasi_bawah: number;
  setting_cek: number;
  catatan: string;
  hasil: QcRollHasil;
}

export interface QcSaveLot {
  lot: string;
  qty_kg: number;
  qty_roll: number;
  warna: string;
  nilai: number;
  alasan_nilai: string;
  rolls: QcSaveRoll[];
}

export interface QcSavePayload {
  isEdit: boolean;
  qc_nomor: string;
  qc_po_nomor: string;
  qc_pod_nourut: number;
  qc_tgl_datang: string;
  qc_keterangan: string;
  qc_qty_datang: number;
  submit: boolean;
  dtl: QcSaveLot[];
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
