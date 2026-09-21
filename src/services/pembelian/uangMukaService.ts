import api from "@/services/api";

export const uangMukaService = {
  getOutstanding(
    params: { search?: string; startDate?: string; endDate?: string } = {},
  ) {
    return api.get("/pembelian/uang-muka/outstanding", {
      params: { page: 1, limit: 1000, ...params },
    });
  },
  getOutstandingDetail(sumber: string, nomor: string) {
    return api.get("/pembelian/uang-muka/outstanding/detail", {
      params: { sumber, nomor },
    });
  },
  getHistory(
    params: { startDate?: string; endDate?: string; cabang?: string } = {},
  ) {
    return api.get("/pembelian/uang-muka/history", { params });
  },
  deleteHistory(nomor: string) {
    return api.delete(
      `/pembelian/uang-muka/history/${encodeURIComponent(nomor)}`,
    );
  },
};
