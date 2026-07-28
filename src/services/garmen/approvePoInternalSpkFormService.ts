import api from "@/services/api";

const BASE = "/garmen/po-internal-spk/approve-sj-form";

export const approvePoInternalSpkFormService = {
  getById: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  save: (nomor: string, payload: any) =>
    api.post(`${BASE}/${encodeURIComponent(nomor)}/save`, payload),

  getPrintData: (mpNomor: string) =>
    api.get(`${BASE}/print/${encodeURIComponent(mpNomor)}`),
};
