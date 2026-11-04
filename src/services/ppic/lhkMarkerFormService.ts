import api from "@/services/api";

const BASE = "/ppic/lhk-marker-form";

import type { ApiResult } from "@/services/piutang/rekapPembayaranService";

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
  status: string;
}

export interface AntreanMarkerData {
  siap: AntreanMarkerItem[];
  saya: AntreanMarkerItem[];
  lain: AntreanMarkerItem[];
}

export interface TandaTerimaBaris {
  urut: number;
  spkNomor: string;
  namaSpk: string;
  lebarKain: string | number | null;
  size: string | null;
  tujuanProses: string | null;
  keterangan: string | null;
  gambar: string | null;
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
  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),
  create: (payload: any) => api.post(BASE, payload),
  update: (nomor: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),
  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),
  searchSpk: (q: string) =>
    api.get(`${BASE}/lookup/search-spk`, { params: { q } }),
  getSpkByNomor: (nomor: string) =>
    api.get(`${BASE}/lookup/spk/${encodeURIComponent(nomor)}`),
  uploadGambar: (file: File, lhkNomor: string, spkNomor: string) => {
    const formData = new FormData();
    formData.append("gambar", file);
    formData.append("lhkNomor", lhkNomor);
    formData.append("tab", "marker");
    formData.append("spkNomor", spkNomor);
    return api.post(`${BASE}/upload-gambar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
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
