import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";

const BASE = "/ppic/lhk-marker-form";

export type StatusBahan = "READY" | "SEBAGIAN" | "BELUM";

export interface BahanBelumReadyItem {
  kode: string;
  nama: string;
  stok: number;
}

export interface AntreanMarkerItem {
  nomor: string;
  tanggal: string;
  deadline: string;
  sisaHari: number;
  keterangan: string | null;
  asalNomor: string | null;
  pic: string | null;
  picNama: string | null;
  picAsalNama: string | null;
  tglAmbil: string | null;
  jmlSpk: number;
  jmlSpkSelesai: number;
  totalJml: number | string;
  spkNomor: string | null;
  spkList?: { nomor: string; nama: string | null }[];
  status: string;
  jmlBahan: number;
  bahanBelumReady: BahanBelumReadyItem[];
  statusBahan: StatusBahan;
}

export interface AntreanMarkerData {
  siap: AntreanMarkerItem[];
  saya: AntreanMarkerItem[];
  lain: AntreanMarkerItem[];
}

// ── Size & rasio ──
export interface SizeSpk {
  size: string;
  qtyOrder: number;
  urut: number;
}

export interface SpkLookupData {
  Nomor: string;
  Nama: string;
  size: SizeSpk[];
  [key: string]: unknown;
}

export interface RasioLoaded {
  rasio: number;
  spreading: number;
  pMarkerCm: number;
  pMarkerM: number;
  totalM: number;
  qty: Record<string, number>;
  sisa: Record<string, number>;
}

export interface BlokLoaded {
  id: number;
  urut: number;
  spkNomor: string;
  namaSpk: string | null;
  pmNomor: string | null;
  kode: string | null;
  namaBahan: string | null;
  satuan: string | null;
  setting: string | null;
  lebarMarker: string;
  untuk: string;
  keterangan: string;
  sizeLama: string;
  formatLama: boolean;
  size: { size: string; qtyOrder: number }[];
  rasio: RasioLoaded[];
}

export interface LhkMarkerLoaded {
  header: {
    lhkp_nomor: string;
    lhkp_tanggal: string;
    lhkp_keterangan: string | null;
    lhkp_pembuat_marker: string | null;
    pembuatMarker: string;
  };
  marker: BlokLoaded[];
}

export interface RasioPayload {
  rasio: number;
  spreading: number;
  pMarkerCm: number;
  qty: Record<string, number>;
}

export interface BlokPayload {
  pmNomor: string;
  spkNomor: string;
  kode: string;
  setting: string;
  lebarMarker: string;
  keterangan: string;
  rasio: RasioPayload[];
}

export interface LhkMarkerPayload {
  tanggal: string;
  keterangan: string;
  marker: BlokPayload[];
}

export interface SaveHasil {
  nomor: string;
}

// ── Tanda terima ──
export interface TandaTerimaBaris {
  urut: number;
  spkNomor: string;
  namaSpk: string | null;
  kodeBahan: string | null;
  namaBahan: string | null;
  setting: string | null;
  lebarMarker: string;
  untuk: string;
  keterangan: string;
  sizeLama: string;
  totalKebutuhan: number | null;
}

export interface TandaTerimaItem {
  nomor: string;
  pmNomor: string;
  peminta: string;
  deadline: string | null;
  tglMutasi: string | null;
  userMutasi: string | null;
  tglTerima: string | null;
  userTerima: string | null;
  baris: TandaTerimaBaris[];
}

export interface TandaTerimaData {
  lhk: {
    nomor: string;
    tanggal: string;
    keterangan: string | null;
    pembuatMarker: string | null;
    userCreate: string | null;
    dateCreate: string | null;
  };
  tandaTerima: TandaTerimaItem[];
}

export const lhkMarkerFormService = {
  getDetail: (nomor: string) =>
    api.get<ApiResult<LhkMarkerLoaded>>(`${BASE}/${encodeURIComponent(nomor)}`),
  create: (payload: LhkMarkerPayload) =>
    api.post<ApiResult<SaveHasil>>(BASE, payload),
  update: (nomor: string, payload: LhkMarkerPayload) =>
    api.put<ApiResult<SaveHasil>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
      payload,
    ),
  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),
  searchSpk: (q: string) =>
    api.get(`${BASE}/lookup/search-spk`, { params: { q } }),
  getSpkByNomor: (nomor: string) =>
    api.get<ApiResult<SpkLookupData>>(
      `${BASE}/lookup/spk/${encodeURIComponent(nomor)}`,
    ),
  ambilPermintaan: (nomor: string) =>
    api.post(`${BASE}/permintaan/${encodeURIComponent(nomor)}/ambil`),
  ambilAlihPermintaan: (nomor: string) =>
    api.post(`${BASE}/permintaan/${encodeURIComponent(nomor)}/ambil-alih`),
  lepasPermintaan: (nomor: string) =>
    api.post(`${BASE}/permintaan/${encodeURIComponent(nomor)}/lepas`),
  getTandaTerima: (nomor: string) =>
    api.get<{ success: boolean; data: TandaTerimaData }>(
      `${BASE}/${encodeURIComponent(nomor)}/tanda-terima`,
    ),
  cetakTandaTerima: (nomor: string) =>
    api.post<{ success: boolean; data: TandaTerimaData }>(
      `${BASE}/${encodeURIComponent(nomor)}/tanda-terima/cetak`,
    ),
};
