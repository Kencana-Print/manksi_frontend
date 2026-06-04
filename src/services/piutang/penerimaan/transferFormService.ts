import api from "@/services/api";

export const transferFormService = {
  getDetail: (nomor: string) =>
    api.get(`/piutang/penerimaan/transfer-form/${encodeURIComponent(nomor)}`),

  saveData: (payload: any) => {
    if (payload.isEdit) {
      return api.put("/piutang/penerimaan/transfer-form", payload);
    }
    return api.post("/piutang/penerimaan/transfer-form", payload);
  },
};
