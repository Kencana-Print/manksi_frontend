import api from "@/services/api";

export const salesOrderService = {
  // Ambil data tabel utama
  getBrowse: (filters: {
    startDate: string;
    endDate: string;
    workshop?: string;
    customer?: string;
  }) => api.get("/mmt/sales-order", { params: filters }),

  getSizes: (nomor: string) =>
    api.get(`/mmt/sales-order/${encodeURIComponent(nomor)}/sizes`),

  // Hapus data
  deleteData: (nomor: string) =>
    api.delete(`/mmt/sales-order/${encodeURIComponent(nomor)}`),

  // Pengajuan PIN (untuk data yang sudah tutup buku/close)
  requestPin: (nomor: string, alasan: string) =>
    api.post(`/mmt/sales-order/${encodeURIComponent(nomor)}/request-pin`, {
      alasan,
    }),

  // Toggle Open/Close Status
  toggleClose: (
    nomor: string,
    payload: { isClose: boolean; alasan?: string },
  ) =>
    api.put(
      `/mmt/sales-order/${encodeURIComponent(nomor)}/toggle-close`,
      payload,
    ),

  // Ambil list workshop untuk dropdown filter
  getWorkshops: () => api.get("/lookups/workshop"),

  approveCmo: (nomor: string) =>
    api.put(`/mmt/sales-order/${encodeURIComponent(nomor)}/approve`),

  getPendingDesigns: (params: { startDate: string; endDate: string }) =>
    api.get("/mmt/sales-order/pending-design", { params }),

  updateDesignStatus: (listNomor: string[]) =>
    api.put("/mmt/sales-order/update-design", { listNomor }),

  getPembatalanDetail: (params: { fbNomor?: string; spkNomor?: string }) =>
    api.get("/mmt/sales-order/pembatalan-detail", { params }),

  ajukanPembatalan: (payload: any) =>
    api.post("/mmt/sales-order/pembatalan-ajukan", payload),

  getGantiQtyKainStatus: (nomor: string) =>
    api.get("/mmt/sales-order/ganti-qty-kain-status", {
      params: { nomor },
    }),

  ajukanGantiQtyKain: (nomor: string, alasan: string) =>
    api.post("/mmt/sales-order/ganti-qty-kain-ajukan", { nomor, alasan }),
};
