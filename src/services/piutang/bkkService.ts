import api from "@/services/api";

export const bkkService = {
  getBrowse(params: { startDate: string; endDate: string; cabang?: string }) {
    return api.get("/piutang/bkk", { params });
  },

  getBrowseDetail(params: {
    startDate: string;
    endDate: string;
    cabang?: string;
  }) {
    return api.get("/piutang/bkk/detail", { params });
  },

  deleteData(nomor: string) {
    return api.delete(`/piutang/bkk/${encodeURIComponent(nomor)}`);
  },
};
