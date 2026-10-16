import api from "@/services/api";

const BASE = "/penjualan/approval-sj";

export const approvalSjService = {
  getBrowse: (tglAwal: string, tglAkhir: string, cabang = "", gudang = "") =>
    api.get(BASE, { params: { tglAwal, tglAkhir, cabang, gudang } }),

  getBrowseDetail: (
    tglAwal: string,
    tglAkhir: string,
    cabang = "",
    nomor = "",
    gudang = "",
  ) =>
    api.get(`${BASE}/detail`, {
      params: { tglAwal, tglAkhir, cabang, nomor, gudang },
    }),

  getAllNotApproved: (gudang = "") =>
    api.get(`${BASE}/all-not-approved`, { params: { gudang } }),

  approveSingle: (nomor: string) =>
    api.put(`${BASE}/approve/${encodeURIComponent(nomor)}`),

  setPending: (nomor: string) =>
    api.put(`${BASE}/pending/${encodeURIComponent(nomor)}`),

  batalSj: (nomor: string) =>
    api.put(`${BASE}/batal/${encodeURIComponent(nomor)}`),

  getBulkList: (divisi = "", cabang = "", gudang = "") =>
    api.get(`${BASE}/bulk-list`, { params: { divisi, cabang, gudang } }),

  approveBulk: (nomorList: string[]) =>
    api.post(`${BASE}/bulk-approve`, { nomorList }),

  getExportData: (
    tglAwal: string,
    tglAkhir: string,
    cabang = "",
    gudang = "",
  ) =>
    api.get(`${BASE}/export`, {
      params: { tglAwal, tglAkhir, cabang, gudang },
    }),

  getExportDetail: (
    tglAwal: string,
    tglAkhir: string,
    cabang = "",
    gudang = "",
  ) =>
    api.get(`${BASE}/export-detail`, {
      params: { tglAwal, tglAkhir, cabang, gudang },
    }),

  getDivisiList: () => api.get(`${BASE}/divisi`),
};
