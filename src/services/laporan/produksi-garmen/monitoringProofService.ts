import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/monitoring-proof";

export const monitoringProofService = {
  getBrowse: (startDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, cab } }),
};
