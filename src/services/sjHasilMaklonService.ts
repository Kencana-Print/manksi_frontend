import api from "@/services/api";

const BASE = "/mmt/sj-hasil-maklon";

export const sjHasilMaklonService = {
  getOutstanding: (params: {
    startDate?: string;
    endDate?: string;
    cab?: string;
    semuaCabang?: boolean;
    keyword?: string;
  }) => api.get(`${BASE}/outstanding`, { params }),

  getAvailableMaklon: (params?: { cab?: string; semuaCabang?: boolean }) =>
    api.get(`${BASE}/available-maklon`, { params }),

  getHistory: (params: {
    startDate?: string;
    endDate?: string;
    cab?: string;
    semuaCabang?: boolean;
    keyword?: string;
  }) => api.get(`${BASE}/history`, { params }),

  getHistoryDetail: (nomor: string) =>
    api.get(`${BASE}/history/${encodeURIComponent(nomor)}/detail`),

  getCreateData: (ids: (string | number)[] = [], mklNomor?: string) =>
    api.get(`${BASE}/create-data`, {
      params: {
        ids: ids && ids.length ? ids.join(",") : undefined,
        mklNomor: mklNomor || undefined,
      },
    }),

  create: (payload: {
    tanggal: string;
    mklNomor?: string;
    ids?: (string | number)[];
    items?: any[];
  }) => api.post(`${BASE}/save`, payload),

  getPrintData: (nomor: string) =>
    api.get(`${BASE}/print/${encodeURIComponent(nomor)}`),
};
