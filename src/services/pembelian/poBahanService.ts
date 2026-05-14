import api from "@/services/api";

export const poBahanService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    search?: string;
  }) => api.get("/pembelian/po-bahan", { params }),

  getBrowseDetail: (nomor: string) =>
    api.get(`/pembelian/po-bahan/detail/${encodeURIComponent(nomor)}`),

  deleteData: (nomor: string) =>
    api.delete(`/pembelian/po-bahan/${encodeURIComponent(nomor)}`),

  toggleClose: (payload: {
    nomor: string;
    isClose: boolean;
    alasan?: string;
  }) => api.post("/pembelian/po-bahan/toggle-close", payload),

  requestPinEdit: (payload: { nomor: string; alasan: string }) =>
    api.post("/pembelian/po-bahan/request-pin", payload),
};
