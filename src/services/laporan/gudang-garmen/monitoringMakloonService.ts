import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/monitoring-makloon";

export const monitoringMakloonService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    cabAsal?: string;
    cabTujuan?: string;
    itemAwal?: string;
    itemJadi?: string;
    status?: string;
    userInput?: string;
  }) => api.get(BASE, { params }),
  getCabangOptions: () => api.get(`${BASE}/cabang-options`),
};
