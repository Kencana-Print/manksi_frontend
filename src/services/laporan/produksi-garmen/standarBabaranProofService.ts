import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/std-babaran-proof";

export const standarBabaranProofService = {
  getBrowse: (startDate: string, endDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, endDate, cab } }),
};
