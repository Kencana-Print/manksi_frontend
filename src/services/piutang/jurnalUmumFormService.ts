import api from "@/services/api";

export const jurnalUmumFormService = {
  getAccountAll() {
    return api.get("/piutang/jurnal-umum-form/account-all");
  },
  getCostCenterOptions() {
    return api.get("/piutang/jurnal-umum-form/cost-center");
  },
  getDcOptions(cckode: string | number) {
    return api.get("/piutang/jurnal-umum-form/dc-options", {
      params: { cckode },
    });
  },
  getDetailForm(nomor: string) {
    return api.get("/piutang/jurnal-umum-form/detail", { params: { nomor } });
  },
  save(payload: any) {
    return api.post("/piutang/jurnal-umum-form", payload);
  },
  update(payload: any) {
    return api.put("/piutang/jurnal-umum-form", payload);
  },
};
