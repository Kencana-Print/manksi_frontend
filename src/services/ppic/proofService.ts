import api from "@/services/api";

const BASE = "/ppic/proof";

export const proofService = {
  getBrowse: (params: { startDate: string; endDate: string; cab: string }) =>
    api.get(BASE, { params }),
  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),
  getExportDetail: (params: {
    startDate: string;
    endDate: string;
    cab: string;
  }) => api.get(`${BASE}/export-detail`, { params }),
  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),
  getMeta: () => api.get(`${BASE}/meta`),
};
