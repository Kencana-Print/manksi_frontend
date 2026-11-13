import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";

const BASE = "/garmen/permintaan-marker";

export type StatusPermintaanMarker =
  | "OPEN"
  | "PROSES"
  | "DONE"
  | "CLOSE"
  | "PENDING"
  | "CANCEL";

export interface PermintaanMarkerBrowseItem {
  nomor: string;
  tanggal: string;
  deadline: string;
  sisaHari: number;
  keterangan: string | null;
  asalNomor: string | null;
  statusManual: string;
  statusKeterangan: string;
  pic: string | null;
  picNama: string | null;
  picAsal: string | null;
  picAsalNama: string | null;
  tglAmbil: string | null;
  userClose: string | null;
  dateClose: string | null;
  userCreate: string;
  dateCreate: string | null;
  jmlBaris: number;
  totalJml: number | string;
  jmlSpk: number;
  spkNomor: string | null;
  spkNama: string | null;
  jmlSpkSelesai: number;
  tglDikerjakan: string | null;
  tglLhk: string | null;
  tglMutasi: string | null;
  tglTerima: string | null;
  jmlTt: number;
  jmlTtTerima: number;
  status: StatusPermintaanMarker;
}

export interface PermintaanMarkerBrowseParams {
  startDate: string;
  endDate: string;
  status?: string;
}

export interface PermintaanMarkerDetailRow {
  nomor: string;
  id: number;
  spkNomor: string;
  spkNama: string | null;
  kode: string;
  namaBahan: string;
  satuan: string;
  setting: string;
  jml: number | string;
  alasan: string;
  lhkNomor: string;
}

export interface TandaTerimaPermintaanItem {
  nomor: string;
  lhkNomor: string;
  peminta: string;
  tglLhk: string | null;
  spk: string | null;
  tglMutasi: string | null;
  userMutasi: string | null;
  tglTerima: string | null;
  userTerima: string | null;
}

export const permintaanMarkerService = {
  getBrowse: (params: PermintaanMarkerBrowseParams) =>
    api.get<ApiResult<PermintaanMarkerBrowseItem[]>>(`${BASE}`, { params }),

  getDetail: (params: { startDate: string; endDate: string }) =>
    api.get<ApiResult<PermintaanMarkerDetailRow[]>>(`${BASE}/detail`, {
      params,
    }),

  deleteData: (nomor: string) =>
    api.delete<ApiResult<null>>(`${BASE}/${encodeURIComponent(nomor)}`),

  getMenungguValidasi: () =>
    api.get<{ success: boolean; data: PermintaanMarkerBrowseItem[] }>(
      `${BASE}/menunggu-validasi`,
    ),

  listTandaTerima: (nomor: string) =>
    api.get<{ success: boolean; data: TandaTerimaPermintaanItem[] }>(
      `${BASE}/${encodeURIComponent(nomor)}/tanda-terima`,
    ),

  validasiTandaTerima: (ttNomor: string) =>
    api.post<{ success: boolean; data: { nomor: string; pmNomor: string } }>(
      `${BASE}/tanda-terima/${encodeURIComponent(ttNomor)}/validasi`,
    ),
};
