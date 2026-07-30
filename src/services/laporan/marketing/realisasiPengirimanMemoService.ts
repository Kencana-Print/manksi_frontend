import api from "@/services/api";

const BASE = "/laporan/marketing/realisasi-kirim-memo";

export const realisasiPengirimanMemoService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    divisi: string | number = 0,
  ) => api.get(BASE, { params: { startDate, endDate, divisi } }),

  updateReason: (mapNomor: string, reason: string) =>
    api.put(`${BASE}/reason`, { mapNomor, reason }),
};
