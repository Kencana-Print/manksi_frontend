import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/monitoring-kurang-prod";

export const monitoringKekuranganProduksiService = {
  getBrowse: (startDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, cab } }),

  getStandarOutput: () => api.get(`${BASE}/standar-output`),
};
