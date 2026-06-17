import api from "@/services/api";

export const dashboardService = {
  getSpkUrgent: () => api.get("/dashboard/spk-urgent"),

  getPenawaranSummary: () => api.get("/dashboard/penawaran-summary"),

  getPenawaranBelumSpk: (limit = 20, offset = 0) =>
    api.get("/dashboard/penawaran-belum-spk", { params: { limit, offset } }),

  getSpkSummary: () => api.get("/dashboard/spk-summary"),

  getRealisasiSummary: () =>
    api.get("/laporan/penjualan/realisasi-penawaran/dashboard-summary"),

  getPoBahanSisa: () => api.get("/dashboard/po-bahan-sisa"),

  getPoBahanBpbSummary: () => api.get("/dashboard/po-bahan-bpb-summary"),

  getPenawaranBelumMap: (limit = 20, offset = 0) =>
    api.get("/dashboard/penawaran-belum-map", { params: { limit, offset } }),

  getPenawaranMapSummary: () => api.get("/dashboard/penawaran-map-summary"),

  getKunjunganSalesSummary: () => api.get("/dashboard/kunjungan-sales-summary"),

  getPiutangDashboard: () => api.get("/dashboard/piutang-dashboard"),

  getPiutangOverdue: (limit = 20, offset = 0) =>
    api.get("/dashboard/piutang-overdue", { params: { limit, offset } }),

  getPenerimaanSummary: () => api.get("/dashboard/penerimaan-summary"),

  getGudangBahanDashboard: () => api.get("/dashboard/gudang-bahan-dashboard"),

  getGudangBahanBuffer: (limit = 20, offset = 0) =>
    api.get("/dashboard/gudang-bahan-buffer", { params: { limit, offset } }),

  getGudangBahanBarcode: (limit = 20, offset = 0) =>
    api.get("/dashboard/gudang-bahan-barcode", { params: { limit, offset } }),
};
