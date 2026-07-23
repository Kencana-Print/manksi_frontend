import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/monitoring-bs";

export const monitoringBsService = {
  getBrowse: (startDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, cab } }),

  getDetail: (spk: string) => api.get(`${BASE}/${encodeURIComponent(spk)}`),
};
