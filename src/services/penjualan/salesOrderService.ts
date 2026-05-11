import api from "@/services/api";

export const salesOrderService = {
  // Ambil data tabel utama
  getBrowse: (filters: {
    startDate: string;
    endDate: string;
    workshop?: string;
    customer?: string;
  }) => api.get("/penjualan/sales-order", { params: filters }),

  getSizes: (nomor: string) =>
    api.get(`/penjualan/sales-order/${encodeURIComponent(nomor)}/sizes`),

  // Hapus data
  deleteData: (nomor: string) =>
    api.delete(`/penjualan/sales-order/${encodeURIComponent(nomor)}`),

  // Pengajuan PIN (untuk data yang sudah tutup buku/close)
  requestPin: (nomor: string, alasan: string) =>
    api.post(
      `/penjualan/sales-order/${encodeURIComponent(nomor)}/request-pin`,
      { alasan },
    ),

  // Toggle Open/Close Status
  toggleClose: (
    nomor: string,
    payload: { isClose: boolean; alasan?: string },
  ) =>
    api.put(
      `/penjualan/sales-order/${encodeURIComponent(nomor)}/toggle-close`,
      payload,
    ),

  // Ambil list workshop untuk dropdown filter
  getWorkshops: () => api.get("/lookups/workshop"),

  approveCmo: (nomor: string) =>
    api.put(`/penjualan/sales-order/${encodeURIComponent(nomor)}/approve`),

  getPendingDesigns: (params: { startDate: string; endDate: string }) =>
    api.get("/penjualan/sales-order/pending-design", { params }),

  updateDesignStatus: (listNomor: string[]) =>
    api.put("/penjualan/sales-order/update-design", { listNomor }),
};
