import api from "@/services/api";

export const cashFormService = {
  getDetail: (nomor: string) =>
    api.get(`/piutang/penerimaan/cash-form/${encodeURIComponent(nomor)}`),

  saveData: (payload: any) => {
    if (payload.isEdit) {
      return api.put("/piutang/penerimaan/cash-form", payload);
    }
    return api.post("/piutang/penerimaan/cash-form", payload);
  },
};
