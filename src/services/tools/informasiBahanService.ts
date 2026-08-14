import api from "@/services/api";

export const informasiBahanService = {
  search: (keyword: string, onlyWithStok = true) =>
    api.get("/tools/sistem-informasi-bahan/search", {
      params: { keyword, onlyWithStok },
    }),

  getSlowMoving: (keyword: string, minTahun: number) =>
    api.get("/tools/sistem-informasi-bahan/slow-moving", {
      params: { keyword, minTahun },
    }),

  getReminder: (keyword: string, minTahun = 3, limit = 5) =>
    api.get("/tools/sistem-informasi-bahan/reminder", {
      params: { keyword, minTahun, limit },
    }),

  getKartuPergerakan: (kode: string, startDate?: string, endDate?: string) =>
    api.get(`/tools/sistem-informasi-bahan/kartu/${encodeURIComponent(kode)}`, {
      params: { startDate, endDate },
    }),
};
