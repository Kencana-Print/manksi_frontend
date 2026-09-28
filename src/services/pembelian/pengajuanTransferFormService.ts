import api from "@/services/api";

export const pengajuanTransferFormService = {
  getAccountOptions() {
    return api.get("/pembelian/pengajuan-transfer-form/account-options");
  },
  getAccountAll(search: string) {
    return api.get("/pembelian/pengajuan-transfer-form/account-all", {
      params: { search },
    });
  },
  getCostCenterOptions(search: string) {
    return api.get("/pembelian/pengajuan-transfer-form/cost-center", {
      params: { search },
    });
  },
  getDcOptions(cckode: string | number, search: string) {
    return api.get("/pembelian/pengajuan-transfer-form/dc-options", {
      params: { cckode, search },
    });
  },
  getSupplierOptions(search: string) {
    return api.get("/pembelian/pengajuan-transfer-form/supplier-options", {
      params: { search },
    });
  },
  getSupplierDetail(kode: string) {
    return api.get("/pembelian/pengajuan-transfer-form/supplier-detail", {
      params: { kode },
    });
  },
  getVoucherOptions(search: string) {
    return api.get("/pembelian/pengajuan-transfer-form/voucher-options", {
      params: { search },
    });
  },
  getPoExternalOptions(search: string) {
    return api.get("/pembelian/pengajuan-transfer-form/poexternal-options", {
      params: { search },
    });
  },
  getPettyCashOptions(search: string) {
    return api.get("/pembelian/pengajuan-transfer-form/pettycash-options", {
      params: { search },
    });
  },
  getDetailForm(nomor: string) {
    return api.get("/pembelian/pengajuan-transfer-form/detail", {
      params: { nomor },
    });
  },
  save(payload: any) {
    return api.post("/pembelian/pengajuan-transfer-form", payload);
  },
  update(payload: any) {
    return api.put("/pembelian/pengajuan-transfer-form", payload);
  },
  realisasi(payload: any) {
    return api.put("/pembelian/pengajuan-transfer-form/realisasi", payload);
  },
  getPrintData(nomor: string) {
    return api.get("/pembelian/pengajuan-transfer-form/print", {
      params: { nomor },
    });
  },
};
