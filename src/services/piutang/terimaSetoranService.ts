import api from "@/services/api";

export const terimaSetoranService = {
  getCabang() {
    return api.get("/piutang/terima-setoran/cabang");
  },

  getBrowse(startDate: string, endDate: string, cabang: string) {
    return api.get("/piutang/terima-setoran", {
      params: { startDate, endDate, cabang },
    });
  },

  getBrowseDetail(startDate: string, endDate: string, cabang: string) {
    return api.get("/piutang/terima-setoran/detail", {
      params: { startDate, endDate, cabang },
    });
  },

  getBrowsePendingAll() {
    return api.get("/piutang/terima-setoran/pending-all");
  },
};
