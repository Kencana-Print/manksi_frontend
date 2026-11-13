import api from "@/services/api";

export interface MbbOutstandingRow {
  nomor: string;
  tanggal: string;
  cab: string;
  ket: string | null;
  kode: string;
  nama: string;
  satuan: string;
  setting: string;
  jenis: string;
  gramasi: string;
  harga: number | string;
  jumlah: number | string;
  dipesan: number | string;
  sisa: number | string;
  keterangan: string | null;
}

export interface RekapHeaderPayload {
  po_tanggal: string;
  po_keterangan: string;
  po_note: string;
  po_mbb_nomor: string;
}

export interface RekapItemPayload {
  nomor?: string;
  nourut?: number;
  kode: string;
  namaext: string;
  satuan: string;
  gramasi: string;
  gramasiAwal: string;
  setting: string;
  jumlah: number;
  harga: number;
  diskon: number;
  ppn: number;
  spk: string;
  mkb: string;
  mppb: string;
  supKode: string;
}

export interface RekapDeliveryPayload {
  tanggal: string;
  jumlah: number;
  kode: string;
  supKode: string;
}

export interface RekapSavePayload {
  isEdit: boolean;
  nomor?: string;
  header: RekapHeaderPayload;
  items: RekapItemPayload[];
  delivery: RekapDeliveryPayload[];
}

export const poBahanFormService = {
  validateField: (type: string, value: string, exclude = "") =>
    api.get("/pembelian/po-bahan/form/validate", {
      params: { type, value, exclude },
    }),

  getSupplierByKode: (kode: string) =>
    api.get(`/pembelian/po-bahan/supplier/${encodeURIComponent(kode)}`),

  getDetail: (nomor: string) =>
    api.get(`/pembelian/po-bahan/form/detail/${encodeURIComponent(nomor)}`),

  getDetailMkb(nomor: string) {
    return api.get(
      `/pembelian/po-bahan/form/mkb-detail/${encodeURIComponent(nomor)}`,
    );
  },

  getMbbOutstanding: (jenis: number, exclude = "") =>
    api.get("/pembelian/po-bahan/form/mbb-outstanding", {
      params: { jenis, exclude },
    }),

  saveData: (payload: any) =>
    api.post("/pembelian/po-bahan/form/save", payload),

  getRekap: (nomor: string) =>
    api.get(`/pembelian/po-bahan/form/rekap/${encodeURIComponent(nomor)}`),

  saveRekap: (payload: RekapSavePayload) =>
    api.post("/pembelian/po-bahan/form/rekap/save", payload),
};
