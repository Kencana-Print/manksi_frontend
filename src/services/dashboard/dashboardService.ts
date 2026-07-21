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
  getRealisasiPenawaranDashboard: () =>
    api.get("/dashboard/realisasi-penawaran"),
  getRealisasiPenawaranDetail: (limit = 20, offset = 0) =>
    api.get("/dashboard/realisasi-penawaran-detail", {
      params: { limit, offset },
    }),
  getMapVsSpkDashboard: (startDate?: string, endDate?: string) =>
    api.get("/dashboard/map-vs-spk-dashboard", {
      params: { startDate, endDate },
    }),
  getMapBelumSpk: (
    limit: number,
    offset: number,
    startDate?: string,
    endDate?: string,
  ) =>
    api.get("/dashboard/map-belum-spk", {
      params: { limit, offset, startDate, endDate },
    }),
  getMapVsSjDashboard: (startDate?: string, endDate?: string) =>
    api.get("/dashboard/map-vs-sj-dashboard", {
      params: { startDate, endDate },
    }),
  getMapBelumKirim: (
    limit: number,
    offset: number,
    startDate?: string,
    endDate?: string,
  ) =>
    api.get("/dashboard/map-belum-kirim", {
      params: { limit, offset, startDate, endDate },
    }),
  getSpkBelumMkbCount: () => api.get("/dashboard/spk-belum-mkb-count"),
  getSpkDeadlineKritis: () => api.get("/dashboard/spk-deadline-kritis"),
  getAktivitasHariIni: (limit = 20, offset = 0) =>
    api.get("/dashboard/aktivitas-hari-ini", { params: { limit, offset } }),
  getTrendSpk7Hari: () => api.get("/dashboard/trend-spk-7hari"),
  getApprovalPendingCount: () => api.get("/dashboard/approval-pending-count"),
  getPipelineSpkProduksi: (startDate: string, endDate: string) =>
    api.get("/dashboard/pipeline-spk-produksi", {
      params: { startDate, endDate },
    }),
  getBahanKurangCount: () => api.get("/dashboard/bahan-kurang-count"),
  getBahanKurangList: (limit = 20, offset = 0) =>
    api.get("/dashboard/bahan-kurang-list", { params: { limit, offset } }),
  getSpkBelumMkbListPaged: (limit = 20, offset = 0) =>
    api.get("/dashboard/spk-belum-mkb-list-paged", {
      params: { limit, offset },
    }),
  getPoJasaVsBpjSummary: () => api.get("/dashboard/po-jasa-vs-bpj-summary"),
  getOutstandingPoMitraSummary: () =>
    api.get("/dashboard/outstanding-po-mitra-summary"),
  getOutstandingPoMitraList: (limit = 20, offset = 0) =>
    api.get("/dashboard/outstanding-po-mitra-list", {
      params: { limit, offset },
    }),
  getEfisiensiBabaranSummary: () =>
    api.get("/dashboard/efisiensi-babaran-summary"),
  getEfisiensiBabaranList: (limit = 20, offset = 0) =>
    api.get("/dashboard/efisiensi-babaran-list", { params: { limit, offset } }),
  getStokAccVsMkaCount: () => api.get("/dashboard/stok-acc-vs-mka-count"),
  getStokAccVsMkaList: (limit = 20, offset = 0) =>
    api.get("/dashboard/stok-acc-vs-mka-list", { params: { limit, offset } }),
  getBarangJadiMetric: () => api.get("/dashboard/barang-jadi-metric"),
  getStokBarangJadiList: (limit = 20, offset = 0, gudang = "") =>
    api.get("/dashboard/stok-barang-jadi-list", {
      params: { limit, offset, gudang },
    }),
  getMutasiBarangJadiList: (limit = 20, offset = 0) =>
    api.get("/dashboard/mutasi-barang-jadi-list", {
      params: { limit, offset },
    }),
};
