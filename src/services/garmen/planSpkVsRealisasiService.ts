import api from "@/services/api";

export const planSpkVsRealisasiService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    divisi: string;
    spkNomor?: string;
  }) => api.get("/garmen/planning-per-spk/plan-vs-realisasi", { params }),

  getDetail: (nomor: string, divisi: string) =>
    api.get(
      `/garmen/planning-per-spk/plan-vs-realisasi/detail/${encodeURIComponent(nomor)}`,
      { params: { divisi } },
    ),
};
