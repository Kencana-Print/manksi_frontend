import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/outstanding-bordir";

export const outstandingBordirService = {
  getBrowse: (startDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, cab } }),
};
