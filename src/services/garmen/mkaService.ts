import api from "@/services/api";

export const mkaService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    kodeBarang?: string;
  }) => api.get("/garmen/mka", { params }),

  getDetail: (nomor: string) =>
    api.get("/garmen/mka/detail", { params: { nomor } }),

  deleteData: (nomor: string) =>
    api.delete("/garmen/mka", { params: { nomor } }),

  exportHeader: (params: {
    startDate: string;
    endDate: string;
    kodeBarang?: string;
  }) => api.get("/garmen/mka/export-header", { params }),

  exportDetail: (params: {
    startDate: string;
    endDate: string;
    kodeBarang?: string;
  }) => api.get("/garmen/mka/export-detail", { params }),
};
