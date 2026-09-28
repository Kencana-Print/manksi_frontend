import api from "@/services/api";

export const bbmFormService = {
  getAccountOptions(cabang: string) {
    return api.get("/piutang/bbm-form/account-options", {
      params: { cabang },
    });
  },
  getAccountAll() {
    return api.get("/piutang/bbm-form/account-all");
  },
  getCostCenterOptions() {
    return api.get("/piutang/bbm-form/cost-center");
  },
  getDcOptions(cckode: string | number) {
    return api.get("/piutang/bbm-form/dc-options", { params: { cckode } });
  },
  getDetailForm(nomor: string) {
    return api.get("/piutang/bbm-form/detail", { params: { nomor } });
  },
  save(payload: any) {
    return api.post("/piutang/bbm-form", payload);
  },
  update(payload: any) {
    return api.put("/piutang/bbm-form", payload);
  },
  getPrintData(nomor: string) {
    return api.get("/piutang/bbm-form/print", { params: { nomor } });
  },
};
