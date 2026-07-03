// services/ppic/planningSpkFormService.ts
import api from "@/services/api";

export const planningSpkFormService = {
  getFormDetail: (nomor: string) =>
    api.get(`/ppic/planning-spk-form/${encodeURIComponent(nomor)}`),

  getSpkInfo: (nomor: string) =>
    api.get("/ppic/planning-spk-form/spk-info", { params: { nomor } }),

  getQtyPoJasa: (spkNomor: string) =>
    api.get("/ppic/planning-spk-form/qty-po", { params: { spkNomor } }),

  // Kirim list SPK via POST agar tidak ada batasan panjang URL
  getRiwayatSpk: (spkList: string[], excludeNomor = "") =>
    api.post("/ppic/planning-spk-form/riwayat", { spkList, excludeNomor }),

  saveData: (payload: any) => api.post("/ppic/planning-spk-form", payload),
};
