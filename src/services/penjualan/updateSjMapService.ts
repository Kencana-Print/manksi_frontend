import api from "@/services/api";

export const updateSjMapService = {
  getBrowseData: (startDate: string, endDate: string) =>
    api.get("/penjualan/update-sj-map", { params: { startDate, endDate } }),

  getStatusOptions: () => api.get("/penjualan/update-sj-map/status-options"),

  updateStatus: (nomor: string, payload: any) =>
    api.put(`/penjualan/update-sj-map/${encodeURIComponent(nomor)}`, payload),

  getDetail: (nomor: string) =>
    api.get(`/penjualan/update-sj-map/${encodeURIComponent(nomor)}`),
};
