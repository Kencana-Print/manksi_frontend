import api from "@/services/api";

const BASE = "/garmen/po-internal-spk/approve-sj";

export const approvePoInternalSpkService = {
  getBrowse: (params: any) => api.get(BASE, { params }),

  getDetail: (nomor: string) =>
    api.get(`${BASE}/detail/${encodeURIComponent(nomor)}`),

  checkApprovable: (nomor: string) =>
    api.get(`${BASE}/check-approvable/${encodeURIComponent(nomor)}`),
};
