import api from "@/services/api";

export const bkmService = {
  getBrowse(params: { startDate: string; endDate: string; cabang?: string }) {
    return api.get("/piutang/bkm", { params });
  },

  getBrowseDetail(params: {
    startDate: string;
    endDate: string;
    cabang?: string;
  }) {
    return api.get("/piutang/bkm/detail", { params });
  },

  deleteData(nomor: string) {
    return api.delete(`/piutang/bkm/${encodeURIComponent(nomor)}`);
  },
};
