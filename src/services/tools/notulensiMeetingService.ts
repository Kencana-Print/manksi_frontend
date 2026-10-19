import api from "@/services/api";

const BASE = "/tools/notulensi-meeting";

export interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface NotulensiBrowseItem {
  nomor: string;
  tanggal: string;
  agenda: string;
  peserta: string | null;
  lokasi: string;
  pembuat: string;
  jmlTindakLanjut: number;
  jmlSelesai: number;
  jmlTerlambat: number;
  bisaUbah: boolean;
}

export interface NotulensiDetailRow {
  noUrut: number;
  hasil: string;
  pic: string;
  deadline: string | null;
  statusUser: string;
  statusSistem: string;
  terlambat: boolean;
}

export interface NotulensiExportRow extends NotulensiDetailRow {
  nomor: string;
  tanggal: string;
  agenda: string;
  lokasi: string;
  peserta: string | null;
}

export const pesanError = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || fallback;
};

export const notulensiMeetingService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get<ApiResult<NotulensiBrowseItem[]>>(BASE, { params }),

  getDetail: (nomor: string) =>
    api.get<ApiResult<NotulensiDetailRow[]>>(
      `${BASE}/${encodeURIComponent(nomor)}/detail`,
    ),

  getExportDetail: (params: { startDate: string; endDate: string }) =>
    api.get<ApiResult<NotulensiExportRow[]>>(`${BASE}/export-detail`, {
      params,
    }),

  deleteData: (nomor: string) =>
    api.delete<ApiResult<null>>(`${BASE}/${encodeURIComponent(nomor)}`),
};
