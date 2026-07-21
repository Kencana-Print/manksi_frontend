import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/spk-mkb-vs-po-bpb";

export const spkMkbVsPoBpbService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get(BASE, { params: { startDate, endDate } }),

  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  getAllDetail: (startDate: string, endDate: string) =>
    api.get(`${BASE}/all-detail`, { params: { startDate, endDate } }),

  getExportCascade: (startDate: string, endDate: string) =>
    api.get(`${BASE}/export-cascade`, { params: { startDate, endDate } }),
};
