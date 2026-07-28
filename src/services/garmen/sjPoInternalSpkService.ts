import api from "@/services/api";

const BASE = "/garmen/po-internal-spk/sj-po-internal";

export const sjPoInternalSpkService = {
  getBrowse: (params: any) => api.get(BASE, { params }),

  getDetail: (nomor: string) =>
    api.get(`${BASE}/detail/${encodeURIComponent(nomor)}`),

  checkModifiable: (nomor: string) =>
    api.get(`${BASE}/check-modifiable/${encodeURIComponent(nomor)}`),

  delete: (nomor: string) =>
    api.delete(`${BASE}/delete/${encodeURIComponent(nomor)}`),
};
