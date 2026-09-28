import api from "@/services/api";

export const bbkFormService = {
  getAccountOptions(cabang: string) {
    return api.get("/piutang/bbk-form/account-options", {
      params: { cabang },
    });
  },
  getAccountAll() {
    return api.get("/piutang/bbk-form/account-all");
  },
  getKeteranganOptions() {
    return api.get("/piutang/bbk-form/keterangan-options");
  },
  getCostCenterOptions() {
    return api.get("/piutang/bbk-form/cost-center");
  },
  getDcOptions(cckode: string | number) {
    return api.get("/piutang/bbk-form/dc-options", { params: { cckode } });
  },
  getSupplierOptions(search: string) {
    return api.get("/piutang/bbk-form/supplier-options", {
      params: { search },
    });
  },
  getDetailForm(nomor: string) {
    return api.get("/piutang/bbk-form/detail", { params: { nomor } });
  },
  save(payload: any) {
    return api.post("/piutang/bbk-form", payload);
  },
  update(payload: any) {
    return api.put("/piutang/bbk-form", payload);
  },
  getPrintData(nomor: string) {
    return api.get("/piutang/bbk-form/print", { params: { nomor } });
  },
  getOutstandingMintaBeli(params: {
    keyword?: string;
    jenis?: string;
    page?: number;
    limit?: number;
  }) {
    return api.get("/piutang/bbk-form/minta-beli-outstanding", { params });
  },
  getOutstandingMintaBeliDetail(nomor: string) {
    return api.get("/piutang/bbk-form/minta-beli-outstanding-detail", {
      params: { nomor },
    });
  },
};
