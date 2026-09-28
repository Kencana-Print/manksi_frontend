import api from "@/services/api";

export const bbkService = {
  getBrowse(params: { startDate: string; endDate: string; cabang?: string }) {
    return api.get("/piutang/bbk", { params });
  },

  getBrowseDetail(params: {
    startDate: string;
    endDate: string;
    cabang?: string;
  }) {
    return api.get("/piutang/bbk/detail", { params });
  },

  deleteData(nomor: string) {
    return api.delete(`/piutang/bbk/${encodeURIComponent(nomor)}`);
  },
};
