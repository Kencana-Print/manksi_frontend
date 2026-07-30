import api from "@/services/api";

const BASE = "/laporan/marketing/realisasi-kirim-spk";

export const realisasiPengirimanSpkService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    divisi: string | number = 0,
  ) => api.get(BASE, { params: { startDate, endDate, divisi } }),

  updateReason: (spkNomor: string, reason: string) =>
    api.put(`${BASE}/reason`, { spkNomor, reason }),
};
