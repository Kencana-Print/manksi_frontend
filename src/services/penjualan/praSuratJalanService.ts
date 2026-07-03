import api from "@/services/api";

const BASE = "/penjualan/pra-sj";

export const praSuratJalanService = {
  getBrowse: (tglAwal: string, tglAkhir: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir } }),

  getBrowseDetail: (tglAwal: string, tglAkhir: string, praSj = "") =>
    api.get(`${BASE}/detail`, { params: { tglAwal, tglAkhir, praSj } }),

  getListForCreateSj: () => api.get(`${BASE}/belum-sj`),

  convertToSj: (tanggal: string, praSjList: string[]) =>
    api.post(`${BASE}/convert-sj`, { tanggal, praSjList }),

  cekBisaUbah: (praSj: string) =>
    api.get(`${BASE}/cek-ubah`, { params: { praSj } }),

  cekBisaHapus: (praSj: string) =>
    api.get(`${BASE}/cek-hapus`, { params: { praSj } }),

  deleteData: (praSj: string) =>
    api.delete(`${BASE}/${encodeURIComponent(praSj)}`),

  getExportData: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir } }),

  getExportDetail: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir } }),
};
