import api from "@/services/api";

export const pengajuanTransferService = {
  getBrowse(params: { startDate: string; endDate: string }) {
    return api.get("/pembelian/pengajuan-transfer", { params });
  },

  getBrowseDetail(params: { startDate: string; endDate: string }) {
    return api.get("/pembelian/pengajuan-transfer/detail", { params });
  },

  getBrowsePendingAll() {
    return api.get("/pembelian/pengajuan-transfer/pending-all");
  },

  getBrowseDetailPendingAll() {
    return api.get("/pembelian/pengajuan-transfer/pending-all/detail");
  },

  getStatus(nomor: string) {
    return api.get(
      `/pembelian/pengajuan-transfer/${encodeURIComponent(nomor)}/status`,
    );
  },

  deleteData(nomor: string) {
    return api.delete(
      `/pembelian/pengajuan-transfer/${encodeURIComponent(nomor)}`,
    );
  },
};
