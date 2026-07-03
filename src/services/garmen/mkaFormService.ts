// services/garmen/mkaFormService.ts
import api from "@/services/api";

export interface MkaDetail {
  kode: string;
  nama: string;
  satuan: string;
  pemakaian: number;
  jumlah: number;
  ready: number;
  free: number;
  po: number;
  keterangan: string;
}

export interface MkaFormData {
  mkb_nomor: string;
  mkb_tanggal: string;
  mkb_spk_nomor: string;
  mkb_note: string;
  // display only (dari SPK, read-only)
  spk_nama: string;
  spk_jumlah: number;
  spk_memo: string;
  divisi: string;
  detail: MkaDetail[];
}

export interface SpkInfoResult {
  exists: boolean;
  hasExisting: boolean;
  error?: string;
  spk?: {
    spk_nomor: string;
    spk_nama: string;
    spk_jumlah: number;
    spk_memo: string;
    divisi: string;
  };
  prefillDetail?: MkaDetail[];
  existing?: MkaFormData;
}

export interface AksesoriItem {
  kode: string;
  nama: string;
  satuan: string;
  ready: number;
}

export const mkaFormService = {
  getDetail: (nomor: string) =>
    api.get("/garmen/mka-form/detail", { params: { nomor } }),

  getSpkInfo: (spkNomor: string) =>
    api.get("/garmen/mka-form/spk-info", { params: { spkNomor } }),

  getAksesorisMaster: (search: string) =>
    api.get("/garmen/mka-form/aksesoris", { params: { search } }),

  getAksesorisByKode: (
    kode: string,
    spkJumlah: number,
    excludeMkaNomor: string,
  ) =>
    api.get("/garmen/mka-form/aksesoris-by-kode", {
      params: { kode, spkJumlah, excludeMkaNomor },
    }),

  saveData: (payload: Record<string, any>) =>
    api.post("/garmen/mka-form", payload),

  deleteData: (nomor: string) =>
    api.delete("/garmen/mka-form", { params: { nomor } }),
};
