import api from "@/services/api";

export const soBelumKomitmenService = {
  getBrowse: (params: {
    startDate?: string;
    endDate?: string;
    cabang?: string;
    divisi?: string;
  }) => api.get("/laporan/marketing/so-belum-komitmen/browse", { params }),

  getCabang: () => api.get("/laporan/marketing/so-belum-komitmen/cabang"),

  getDivisi: () => api.get("/laporan/marketing/so-belum-komitmen/divisi"),
};
