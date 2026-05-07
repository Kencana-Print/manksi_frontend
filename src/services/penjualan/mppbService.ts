import api from "@/services/api";

export const mppbService = {
  getBrowseList: (startDate: string, endDate: string) =>
    api.get("/penjualan/mppb", { params: { startDate, endDate } }),

  deleteData: (nomor: string) =>
    api.delete(`/penjualan/mppb/${encodeURIComponent(nomor)}`),

  toggleApprove: (nomor: string, currentStatus: string) =>
    api.put(`/penjualan/mppb/${encodeURIComponent(nomor)}/approve`, {
      currentStatus,
    }),

  requestPin5: (nomor: string, alasan: string) =>
    api.post("/penjualan/mppb/pengajuan", { nomor, alasan }),
};
