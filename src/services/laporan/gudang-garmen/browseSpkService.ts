import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/browse-spk";

export interface PrintPermission {
  allowed: boolean;
  count: number;
  approvalStatus: string; // "" | "WAIT" | "TOLAK" | "ACC_READY"
}

export const browseSpkService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get(BASE, { params: { startDate, endDate } }),

  getPrintPermission: (nomor: string) =>
    api.get<{ success: boolean; data: PrintPermission }>(
      `${BASE}/${encodeURIComponent(nomor)}/print-permission`,
    ),

  requestPrintApproval: (nomor: string, alasan: string) =>
    api.post(`${BASE}/${encodeURIComponent(nomor)}/request-print-approval`, {
      alasan,
    }),

  recordPrint: (nomor: string) =>
    api.post(`${BASE}/${encodeURIComponent(nomor)}/record-print`),
};
