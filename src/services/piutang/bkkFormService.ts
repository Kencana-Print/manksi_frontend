import api from "@/services/api";

export const bkkFormService = {
  getAccountOptions(cabang: string) {
    return api.get("/piutang/bkk-form/account-options", {
      params: { cabang },
    });
  },
  getAccountAll() {
    return api.get("/piutang/bkk-form/account-all");
  },
  getKeteranganOptions() {
    return api.get("/piutang/bkk-form/keterangan-options");
  },
  getCostCenterOptions() {
    return api.get("/piutang/bkk-form/cost-center");
  },
  getDcOptions(cckode: string | number) {
    return api.get("/piutang/bkk-form/dc-options", { params: { cckode } });
  },
  getSupplierOptions(search: string) {
    return api.get("/piutang/bkk-form/supplier-options", {
      params: { search },
    });
  },
  getSupplierDetail(kode: string) {
    return api.get("/piutang/bkk-form/supplier-detail", { params: { kode } });
  },
  getPettyCashOptions(search: string) {
    return api.get("/piutang/bkk-form/petty-cash-options", {
      params: { search },
    });
  },
  getDetailForm(nomor: string) {
    return api.get("/piutang/bkk-form/detail", { params: { nomor } });
  },
  save(payload: any) {
    return api.post("/piutang/bkk-form", payload);
  },
  update(payload: any) {
    return api.put("/piutang/bkk-form", payload);
  },
  getPrintData(nomor: string) {
    return api.get("/piutang/bkk-form/print", { params: { nomor } });
  },
  getAccountKasHeaderOptions() {
    return api.get("/piutang/bkk-form/account-kas-header");
  },
  getOutstandingMintaBeli(params: {
    keyword?: string;
    jenis?: string;
    page?: number;
    limit?: number;
  }) {
    return api.get("/piutang/bkk-form/minta-beli-outstanding", { params });
  },
  getOutstandingMintaBeliDetail(nomor: string) {
    return api.get("/piutang/bkk-form/minta-beli-outstanding-detail", {
      params: { nomor },
    });
  },
};
