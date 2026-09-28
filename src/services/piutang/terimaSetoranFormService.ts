import api from "@/services/api";

export const terimaSetoranFormService = {
  getForm(nomor: string) {
    return api.get(`/piutang/terima-setoran-form/${encodeURIComponent(nomor)}`);
  },
  saveForm(nomor: string, payload: any) {
    return api.put(
      `/piutang/terima-setoran-form/${encodeURIComponent(nomor)}`,
      payload,
    );
  },
};
