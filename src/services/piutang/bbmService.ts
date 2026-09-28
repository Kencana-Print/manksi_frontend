import api from "@/services/api";

export const bbmService = {
  getBrowse(params: { startDate: string; endDate: string; cabang?: string }) {
    return api.get("/piutang/bbm", { params });
  },

  getBrowseDetail(params: {
    startDate: string;
    endDate: string;
    cabang?: string;
  }) {
    return api.get("/piutang/bbm/detail", { params });
  },

  deleteData(nomor: string) {
    return api.delete(`/piutang/bbm/${encodeURIComponent(nomor)}`);
  },
};