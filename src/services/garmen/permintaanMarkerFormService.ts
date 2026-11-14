import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";
import type { StatusPermintaanMarker } from "@/services/garmen/permintaanMarkerService";

const BASE = "/garmen/permintaan-marker-form";

export interface BahanMkb {
  kode: string;
  nama: string;
  satuan: string;
  setting: string;
}

export interface BahanInfo extends BahanMkb {
  diMkb: boolean;
}

export interface SettingBahan {
  kode: string;
  nama: string;
}

export interface MarkerDetailLoaded {
  id: number;
  spkNomor: string;
  spkNama: string | null;
  kode: string;
  namaBahan: string;
  satuan: string;
  setting: string;
  jml: number;
  alasan: string;
}

export interface MarkerLhkLoaded {
  lhkNomor: string;
  spkNomor: string;
  lebarKain: string;
  size: string;
}

export interface PermintaanMarkerLoaded {
  nomor: string;
  tanggal: string;
  deadline: string;
  keterangan: string;
  asalNomor: string | null;
  statusManual: string;
  statusKeterangan: string;
  userCreate: string;
  penggantiNomor: string | null;
  jmlSpk: number;
  jmlSpkSelesai: number;
  status: StatusPermintaanMarker;
  bisaUbah: boolean;
  detail: MarkerDetailLoaded[];
  lhk: MarkerLhkLoaded[];
}

export interface MarkerDetailPayload {
  spkNomor: string;
  kode: string;
  setting: string;
}

export interface PermintaanMarkerPayload {
  tanggal: string;
  deadline: string;
  keterangan: string;
  asalNomor: string;
  detail: MarkerDetailPayload[];
}

export interface SaveHasil {
  nomor: string;
}

export interface StatusPayload {
  status: "PENDING" | "CANCEL" | "";
  keterangan: string;
}

export const permintaanMarkerFormService = {
  getDetail: (nomor: string) =>
    api.get<ApiResult<PermintaanMarkerLoaded>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
    ),

  save: (payload: PermintaanMarkerPayload) =>
    api.post<ApiResult<SaveHasil>>(`${BASE}`, payload),

  update: (nomor: string, payload: PermintaanMarkerPayload) =>
    api.put<ApiResult<SaveHasil>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
      payload,
    ),

  setStatus: (nomor: string, payload: StatusPayload) =>
    api.patch<ApiResult<SaveHasil>>(
      `${BASE}/${encodeURIComponent(nomor)}/status`,
      payload,
    ),

  getBahanMkb: (spk: string) =>
    api.get<ApiResult<BahanMkb[]>>(`${BASE}/lookups/bahan-mkb`, {
      params: { spk },
    }),

  getBahanInfo: (kode: string, spk: string) =>
    api.get<ApiResult<BahanInfo>>(
      `${BASE}/lookups/bahan/${encodeURIComponent(kode)}`,
      { params: { spk } },
    ),

  getSetting: () =>
    api.get<ApiResult<SettingBahan[]>>(`${BASE}/lookups/setting`),

  closePermintaan: (nomor: string) =>
    api.post<ApiResult<SaveHasil>>(
      `${BASE}/${encodeURIComponent(nomor)}/close`,
    ),
};
