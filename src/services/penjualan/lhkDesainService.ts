import api from "@/services/api";

export const lhkDesainService = {
  getOutstanding: (filters: {
    startDate: string;
    endDate: string;
    customer?: string;
    jenisPekerjaan?: string;
  }) => api.get("/penjualan/lhk-desain/outstanding", { params: filters }),

  getHistory: (filters: {
    startDate: string;
    endDate: string;
    customer?: string;
  }) => api.get("/penjualan/lhk-desain/history", { params: filters }),

  createBatch: (pdNomorList: string[]) =>
    api.post("/penjualan/lhk-desain", { pdNomorList }),
};
