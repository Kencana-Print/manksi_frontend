import api from "@/services/api";

const BASE = "/garmen/makloon/sj-hasil-makloon";

export const sjHasilMakloonService = {
  getOutstanding: (params: {
    startDate: string;
    endDate: string;
    cab?: string;
  }) => api.get(`${BASE}/outstanding`, { params }),
  getHistory: (params: { startDate: string; endDate: string; cab?: string }) =>
    api.get(`${BASE}/history`, { params }),
  getHistoryDetail: (nomor: string) =>
    api.get(`${BASE}/history/${encodeURIComponent(nomor)}/detail`),
  getCreateData: (ids: number[]) =>
    api.get(`${BASE}/create-data`, { params: { ids: ids.join(",") } }),
  create: (payload: { tanggal: string; ids: number[] }) =>
    api.post(`${BASE}/save`, payload),
  getPrintData: (nomor: string) =>
    api.get(`${BASE}/print/${encodeURIComponent(nomor)}`),
};
