import api from "@/services/api";

export const jurnalUmumService = {
  getBrowse(params: { startDate: string; endDate: string }) {
    return api.get("/piutang/jurnal-umum", { params });
  },

  getBrowseDetail(params: { startDate: string; endDate: string }) {
    return api.get("/piutang/jurnal-umum/detail", { params });
  },

  deleteData(nomor: string) {
    return api.delete(`/piutang/jurnal-umum/${encodeURIComponent(nomor)}`);
  },
};
