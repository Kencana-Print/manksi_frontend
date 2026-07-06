import api from "@/services/api";

export const spkService = {
  getBrowse: (params: {
    startDate?: string;
    endDate?: string;
    workshop?: string;
    customer?: string;
  }) => api.get("/ppic/spk", { params }),

  getSizes: (nomor: string) =>
    api.get(`/ppic/spk/${encodeURIComponent(nomor)}/sizes`),

  deleteData: (nomor: string) =>
    api.delete(`/ppic/spk/${encodeURIComponent(nomor)}`),

  toggleClose: (
    nomor: string,
    payload: { isClose: boolean; alasan?: string },
  ) => api.put(`/ppic/spk/${encodeURIComponent(nomor)}/toggle-close`, payload),

  requestPin: (nomor: string, alasan: string) =>
    api.post(`/ppic/spk/${encodeURIComponent(nomor)}/request-pin`, { alasan }),

  approveCmo: (nomor: string) =>
    api.put(`/ppic/spk/${encodeURIComponent(nomor)}/approve`),

  getWorkshops: () => api.get("/lookups/cabang-pabrik"),

  checkPrintPermission: (nomor: string) =>
    api.get(`/ppic/spk/${encodeURIComponent(nomor)}/print-check`),
  requestPrintApproval: (nomor: string, alasan: string) =>
    api.post(`/ppic/spk/${encodeURIComponent(nomor)}/request-print-approval`, {
      alasan,
    }),
  recordPrint: (nomor: string) =>
    api.post(`/ppic/spk/${encodeURIComponent(nomor)}/record-print`),
};
