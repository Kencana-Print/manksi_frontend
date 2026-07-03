import api from "@/services/api";

const BASE = "/penjualan/approval-sj";

export const approvalSjService = {
  getBrowse: (tglAwal: string, tglAkhir: string, cabang = "") =>
    api.get(BASE, { params: { tglAwal, tglAkhir, cabang } }),

  getBrowseDetail: (
    tglAwal: string,
    tglAkhir: string,
    cabang = "",
    nomor = "",
  ) =>
    api.get(`${BASE}/detail`, { params: { tglAwal, tglAkhir, cabang, nomor } }),

  getAllNotApproved: () => api.get(`${BASE}/all-not-approved`),

  approveSingle: (nomor: string) =>
    api.put(`${BASE}/approve/${encodeURIComponent(nomor)}`),

  setPending: (nomor: string) =>
    api.put(`${BASE}/pending/${encodeURIComponent(nomor)}`),

  batalSj: (nomor: string) =>
    api.put(`${BASE}/batal/${encodeURIComponent(nomor)}`),

  getBulkList: (divisi = "", cabang = "") =>
    api.get(`${BASE}/bulk-list`, { params: { divisi, cabang } }),

  approveBulk: (nomorList: string[]) =>
    api.post(`${BASE}/bulk-approve`, { nomorList }),

  getExportData: (tglAwal: string, tglAkhir: string, cabang = "") =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir, cabang } }),

  getExportDetail: (tglAwal: string, tglAkhir: string, cabang = "") =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir, cabang } }),

  getDivisiList: () => api.get(`${BASE}/divisi`),
};
