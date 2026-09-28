import api from "@/services/api";

export const voucherPembayaranService = {
  getBrowse(startDate: string, endDate: string) {
    return api.get("/piutang/voucher-pembayaran", {
      params: { startDate, endDate },
    });
  },

  getBrowseDetail(startDate: string, endDate: string) {
    return api.get("/piutang/voucher-pembayaran/detail", {
      params: { startDate, endDate },
    });
  },

  getBrowsePendingAll() {
    return api.get("/piutang/voucher-pembayaran/pending-all");
  },

  getBrowseDetailPendingAll() {
    return api.get("/piutang/voucher-pembayaran/pending-all/detail");
  },

  deleteData(nomor: string) {
    return api.delete(
      `/piutang/voucher-pembayaran/${encodeURIComponent(nomor)}`,
    );
  },

  cekPengajuan(nomor: string) {
    return api.get(
      `/piutang/voucher-pembayaran/${encodeURIComponent(nomor)}/cek-pengajuan`,
    );
  },

  requestPin5(nomor: string, alasan: string) {
    return api.post(
      `/piutang/voucher-pembayaran/${encodeURIComponent(nomor)}/request-pin5`,
      { alasan },
    );
  },
};
