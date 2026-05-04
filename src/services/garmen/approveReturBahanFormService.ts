import api from "@/services/api";

export const approveReturBahanFormService = {
  getDetail(nomor: string) {
    return api.get(
      `/garmen/bahan-baku/approve-retur/form/${encodeURIComponent(nomor)}`,
    );
  },

  saveData(payload: any) {
    return api.post("/garmen/bahan-baku/approve-retur/form", payload);
  },
};
