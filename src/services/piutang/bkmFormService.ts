import api from "@/services/api";

export const bkmFormService = {
  getAccountOptions(cabang: string) {
    return api.get("/piutang/bkm-form/account-options", {
      params: { cabang },
    });
  },
  getAccountAll() {
    return api.get("/piutang/bkm-form/account-all");
  },
  getCostCenterOptions() {
    return api.get("/piutang/bkm-form/cost-center");
  },
  getDcOptions(cckode: string | number) {
    return api.get("/piutang/bkm-form/dc-options", { params: { cckode } });
  },
  getDetailForm(nomor: string) {
    return api.get("/piutang/bkm-form/detail", { params: { nomor } });
  },
  save(payload: any) {
    return api.post("/piutang/bkm-form", payload);
  },
  update(payload: any) {
    return api.put("/piutang/bkm-form", payload);
  },
  getPrintData(nomor: string) {
    return api.get("/piutang/bkm-form/print", { params: { nomor } });
  },
};
