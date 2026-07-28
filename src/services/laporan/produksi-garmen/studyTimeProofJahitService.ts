import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/study-time-proof-jahit";

export const studyTimeProofJahitService = {
  getBrowse: (startDate: string, endDate: string, cab = "P04") =>
    api.get(BASE, { params: { startDate, endDate, cab } }),
};
