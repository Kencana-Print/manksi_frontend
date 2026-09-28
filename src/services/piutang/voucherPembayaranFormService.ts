import api from "@/services/api";

export const voucherPembayaranFormService = {
  getSupplier(kode: string) {
    return api.get(
      `/piutang/voucher-pembayaran-form/supplier/${encodeURIComponent(kode)}`,
    );
  },
  searchSupplier(search: string) {
    return api.get("/piutang/voucher-pembayaran-form/supplier-options", {
      params: { search },
    });
  },
  getNotaDetail(kode: string, statusPpn: number, type: string) {
    return api.get("/piutang/voucher-pembayaran-form/nota-detail", {
      params: { kode, statusPpn, type },
    });
  },
  searchNota(type: string, supKode: string, search: string) {
    return api.get("/piutang/voucher-pembayaran-form/nota-search", {
      params: { type, supKode, search },
    });
  },
  getDetailForm(nomor: string) {
    return api.get(
      `/piutang/voucher-pembayaran-form/${encodeURIComponent(nomor)}`,
    );
  },
  cekStatusRealisasi(nomor: string) {
    return api.get(
      `/piutang/voucher-pembayaran-form/${encodeURIComponent(nomor)}/status-realisasi`,
    );
  },
  save(payload: any) {
    return api.post("/piutang/voucher-pembayaran-form", payload);
  },
  update(payload: any) {
    return api.put("/piutang/voucher-pembayaran-form", payload);
  },
  getPrintData(nomor: string) {
    return api.get(
      `/piutang/voucher-pembayaran/${encodeURIComponent(nomor)}/print`,
    );
  },
};
