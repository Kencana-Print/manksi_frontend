import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/realisasi-keluar-bahan";

export const realisasiKeluarBahanService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    spkNomor = "",
    page = 1,
    limit = 50,
  ) => api.get(BASE, { params: { startDate, endDate, spkNomor, page, limit } }),
};
