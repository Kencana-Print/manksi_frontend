import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/monitoring-produksi";

export const monitoringProduksiService = {
  getBrowse: (startDate: string, endDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, endDate, cab } }),
};
