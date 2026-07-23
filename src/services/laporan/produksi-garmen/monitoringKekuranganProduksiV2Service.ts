import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/monitoring-kurang-prodv2";

export const monitoringKekuranganProduksiV2Service = {
  getBrowse: (startDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, cab } }),

  getDetail: (spk: string) => api.get(`${BASE}/${encodeURIComponent(spk)}`),
};
