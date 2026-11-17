import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";

const BASE = "/tools/memo-internal";

export interface MemoTarget {
  bagian: string[];
  jabatan: string[];
}

export interface MemoOpsi {
  bagian: string[];
  jabatan: { kode: string; nama: string }[];
}

export interface MemoItem {
  id: number;
  nomor: string;
  tanggal: string;
  judul: string;
  keterangan: string;
  namaAsli: string;
  ukuran: number;
  notif: boolean;
  userCreate: string;
  userNama: string;
  dateCreate: string;
  sudahBaca: boolean;
  // Hanya terisi untuk bagian yang boleh mengelola memo (null untuk user biasa)
  target: MemoTarget | null;
}

export interface MemoListData {
  items: MemoItem[];
  bolehUpload: boolean;
}

export interface MemoUnreadData {
  jumlah: number;
  terbaru: { id: number; judul: string; tanggal: string }[];
}

export interface MemoUploadInput {
  nomor: string;
  tanggal: string;
  judul: string;
  keterangan: string;
  notif: boolean;
  target: MemoTarget;
  file: File;
}

export const memoInternalService = {
  getList: () => api.get<ApiResult<MemoListData>>(BASE),

  getUnread: () => api.get<ApiResult<MemoUnreadData>>(`${BASE}/unread`),

  getOpsi: () => api.get<ApiResult<MemoOpsi>>(`${BASE}/opsi`),

  upload: (input: MemoUploadInput) => {
    const fd = new FormData();
    fd.append("nomor", input.nomor);
    fd.append("tanggal", input.tanggal);
    fd.append("judul", input.judul);
    fd.append("keterangan", input.keterangan);
    fd.append("notif", input.notif ? "1" : "0");
    fd.append("target", JSON.stringify(input.target));
    fd.append("file", input.file);
    return api.post<ApiResult<{ id: number }>>(BASE, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  ubahTarget: (id: number, target: MemoTarget) =>
    api.put<ApiResult<{ id: number }>>(`${BASE}/${id}/target`, target),

  hapus: (id: number) => api.delete<ApiResult<null>>(`${BASE}/${id}`),

  // PDF disajikan lewat endpoint terautentikasi, jadi diambil sebagai blob
  getFile: (id: number) =>
    api.get<Blob>(`${BASE}/${id}/file`, { responseType: "blob" }),
};
