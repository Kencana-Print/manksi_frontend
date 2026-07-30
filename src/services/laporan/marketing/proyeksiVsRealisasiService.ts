import api from "@/services/api";

const BASE = "/laporan/marketing/proyeksi-vs-realisasi";

export const proyeksiVsRealisasiService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get(BASE, { params: { startDate, endDate } }),
};
