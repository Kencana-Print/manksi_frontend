import api from "@/services/api";
import type {
  ApiResult,
  NotulensiDetailRow,
} from "@/services/tools/notulensiMeetingService";

const BASE = "/tools/notulensi-meeting-form";

export const STATUS_USER_OPTIONS = ["OPEN", "PROGRESS", "DONE", "BATAL"];

export const STATUS_SISTEM_OPTIONS = STATUS_USER_OPTIONS;

export interface NotulensiSaveDetail {
  hasil: string;
  pic: string;
  deadline: string;
  statusUser: string;
  statusSistem: string;
}

export interface NotulensiStatusRow {
  noUrut: number;
  statusUser: string;
  statusSistem: string;
}

export interface NotulensiSavePayload {
  tanggal: string;
  agenda: string;
  peserta: string;
  lokasi: string;
  detail: NotulensiSaveDetail[];
}

export interface NotulensiFormData {
  nomor: string;
  tanggal: string;
  agenda: string;
  peserta: string;
  lokasi: string;
  pembuat: string;
  bisaUbah: boolean;
  detail: NotulensiDetailRow[];
}

export interface NotulensiCetakData extends NotulensiFormData {
  namaPembuat: string;
}

export const notulensiMeetingFormService = {
  getLookupBagian: () => api.get<ApiResult<string[]>>(`${BASE}/lookups/bagian`),

  getById: (nomor: string) =>
    api.get<ApiResult<NotulensiFormData>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
    ),

  getCetak: (nomor: string) =>
    api.get<ApiResult<NotulensiCetakData>>(
      `${BASE}/${encodeURIComponent(nomor)}/cetak`,
    ),

  create: (payload: NotulensiSavePayload) =>
    api.post<ApiResult<{ nomor: string }>>(BASE, payload),

  update: (nomor: string, payload: NotulensiSavePayload) =>
    api.put<ApiResult<{ nomor: string }>>(
      `${BASE}/${encodeURIComponent(nomor)}`,
      payload,
    ),

  updateStatus: (nomor: string, payload: { detail: NotulensiStatusRow[] }) =>
    api.patch<ApiResult<{ nomor: string }>>(
      `${BASE}/${encodeURIComponent(nomor)}/status`,
      payload,
    ),
};
