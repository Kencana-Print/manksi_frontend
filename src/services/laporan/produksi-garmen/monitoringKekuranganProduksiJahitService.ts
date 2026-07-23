import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/monitoring-kurang-prod-jahit";

export const monitoringKekuranganProduksiJahitService = {
  getBrowse: (startDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, cab } }),
};
