import api from "@/services/api";

const BASE = "/mmt/bast-map";

export const bastMapMmtService = {
  getBrowseList: (params: {
    startDate?: string;
    endDate?: string;
    onProgress?: boolean;
    search?: string;
    cabang?: string;
    workshop?: string;
    sublim?: string;
  }) => api.get(`${BASE}/`, { params }),

  getDetail: (nomor: string) =>
    api.get(`${BASE}/detail`, { params: { nomor } }),

  deleteBast: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),

  getExportDetail: (params: any) =>
    api.get(`${BASE}/export-detail`, { params }),
};

export default bastMapMmtService;
