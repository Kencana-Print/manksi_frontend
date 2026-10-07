import api from "@/services/api";

const BASE = "/penjualan/permintaan-desain";

export interface DetailPayload {
  id?: number | null;
  desain: string;
  jml: number;
  desainer?: string | null;
}

export interface AntreanItem {
  Pd2Id: number;
  PdNomor: string;
  Desain: string;
  Jml: number;
  Dikerjakan: number;
  Sisa: number;
  DesainerKode: string | null;
  NamaProject: string;
  Customer: string;
  JenisPekerjaan: string;
  Prioritas: string;
  Dateline: string | null;
  StatusPd: string;
}

export interface KerjaAktif {
  KerjaId: number;
  PdNomor: string;
  Pd2Id: number;
  Desain: string;
  JmlDetail: number;
  Jml: number;
  DesainerKode: string;
  Desainer: string;
  AsalDesainer: string | null;
  TglMulai: string;
  NamaProject: string;
}

export interface AntreanData {
  antrean: AntreanItem[];
  kerjaSaya: KerjaAktif[];
  kerjaLain: KerjaAktif[];
}

export interface CloseKerjaResult {
  lhkNomor: string;
  pdNomor: string;
  jml: number;
  statusPd: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const permintaanDesainService = {
  getBrowse: (filters: {
    startDate: string;
    endDate: string;
    status?: string;
    customer?: string;
    marketing?: string;
    jenisPekerjaan?: string;
  }) => api.get(BASE, { params: filters }),

  searchReferensi: (params: { q?: string; page?: number; limit?: number }) =>
    api.get(`${BASE}/search`, { params }),

  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  createPD: (payload: {
    tanggal: string;
    namaProject: string;
    customer?: string;
    jenisPekerjaan: string;
    dateline?: string;
    keterangan?: string;
    prioritas: string;
    desainer?: string;
    referensi?: string;
    items: DetailPayload[];
  }) => api.post(BASE, payload),

  updateHeader: (
    nomor: string,
    payload: {
      namaProject: string;
      customer?: string;
      customerNama?: string;
      jenisPekerjaan: string;
      dateline?: string;
      keterangan?: string;
      items: DetailPayload[];
    },
  ) => api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),

  updateDesainer: (
    nomor: string,
    payload: { pd2Id?: number; desainerKode: string | null },
  ) => api.put(`${BASE}/${encodeURIComponent(nomor)}/desainer`, payload),

  setStatusManual: (
    nomor: string,
    payload: { status: string; keterangan: string; referensi?: string },
  ) => api.put(`${BASE}/${encodeURIComponent(nomor)}/status`, payload),

  resumeStatus: (nomor: string) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}/resume`),

  closePD: (nomor: string, payload: { soMapNomor: string; path: string }) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}/close`, payload),

  bukaKembali: (nomor: string) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}/buka-kembali`),

  getLampiran: (nomor: string) =>
    api.get(`${BASE}/${encodeURIComponent(nomor)}/lampiran`),

  addLampiran: (nomor: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api.post(`${BASE}/${encodeURIComponent(nomor)}/lampiran`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteLampiran: (id: number) => api.delete(`${BASE}/lampiran/${id}`),

  getDesainerOptions: () => api.get(`${BASE}/desainer-options`),

  // ── Antrean & pengerjaan desainer ──
  getAntrean: () => api.get<ApiResult<AntreanData>>(`${BASE}/antrean`),

  mulaiKerja: (pd2Id: number, jml: number) =>
    api.post(`${BASE}/detail/${pd2Id}/kerja`, { jml }),

  updateKerja: (kerjaId: number, jml: number) =>
    api.put(`${BASE}/kerja/${kerjaId}`, { jml }),

  batalKerja: (kerjaId: number) => api.delete(`${BASE}/kerja/${kerjaId}`),

  closeKerja: (kerjaIds: number[]) =>
    api.post<ApiResult<CloseKerjaResult>>(`${BASE}/kerja/close`, { kerjaIds }),

  ambilAlih: (kerjaId: number) =>
    api.post(`${BASE}/kerja/${kerjaId}/ambil-alih`),
};
