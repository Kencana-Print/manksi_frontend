import api from "@/services/api";

export const giroFormService = {
  getDetail: (nomor: string) =>
    api.get(`/piutang/penerimaan/giro-form/${encodeURIComponent(nomor)}`),

  saveData: (payload: any) => {
    if (payload.isEdit) {
      return api.put("/piutang/penerimaan/giro-form", payload);
    }
    return api.post("/piutang/penerimaan/giro-form", payload);
  },
};
