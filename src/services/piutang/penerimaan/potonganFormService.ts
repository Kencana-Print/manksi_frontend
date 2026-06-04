import api from "@/services/api";

export const potonganFormService = {
  getDetail: (nomor: string) =>
    api.get(`/piutang/penerimaan/potongan-form/${encodeURIComponent(nomor)}`),

  saveData: (payload: any) => {
    if (payload.isEdit) {
      return api.put("/piutang/penerimaan/potongan-form", payload);
    }
    return api.post("/piutang/penerimaan/potongan-form", payload);
  },
};
