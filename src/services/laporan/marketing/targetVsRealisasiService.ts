import api from "@/services/api";

const BASE = "/laporan/marketing/target-vs-realisasi";

export const targetVsRealisasiService = {
  getBrowse: (tahun: number | string, bulan: string | number = "") =>
    api.get(BASE, { params: { tahun, bulan } }),
};
