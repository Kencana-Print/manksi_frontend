import api from "@/services/api";

export const dashboardService = {
  getSpkUrgent: () => api.get("/dashboard/spk-urgent"),

  getPenawaranSummary: () => api.get("/dashboard/penawaran-summary"),

  getPenawaranBelumSpk: (limit = 20, offset = 0) =>
    api.get("/dashboard/penawaran-belum-spk", { params: { limit, offset } }),

  getSpkSummary: () => api.get("/dashboard/spk-summary"),

  getRealisasiSummary: () =>
    api.get("/laporan/penjualan/realisasi-penawaran/dashboard-summary"),
};
