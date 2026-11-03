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
  jmlSpkSelesai: number;
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

export const permintaanMarkerService = {
  getBrowse: (params: PermintaanMarkerBrowseParams) =>
    api.get<ApiResult<PermintaanMarkerBrowseItem[]>>(`${BASE}`, { params }),

  getDetail: (params: { startDate: string; endDate: string }) =>
    api.get<ApiResult<PermintaanMarkerDetailRow[]>>(`${BASE}/detail`, {
      params,
    }),

  deleteData: (nomor: string) =>
    api.delete<ApiResult<null>>(`${BASE}/${encodeURIComponent(nomor)}`),
};
