import api from "@/services/api";

const BASE = "/penjualan/update-status-sj";

export const updateStatusSjService = {
  getBrowse: (tglAwal: string, tglAkhir: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir } }),

  getBrowseDetail: (tglAwal: string, tglAkhir: string, nomor = "") =>
    api.get(`${BASE}/detail`, { params: { tglAwal, tglAkhir, nomor } }),

  getExportData: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir } }),

  getExportDetail: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir } }),

  getStatusList: () => api.get(`${BASE}/status-list`),

  getFormById: (nomor: string) =>
    api.get(`${BASE}/form`, { params: { nomor } }),

  saveStatus: (nomor: string, payload: any) =>
    api.put(`${BASE}/form/${encodeURIComponent(nomor)}`, payload),
};
