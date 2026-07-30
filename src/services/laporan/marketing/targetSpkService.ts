import api from "@/services/api";

const BASE = "/laporan/marketing/target-spk";

export const targetSpkService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    divisi: string;
    salesKode?: string;
    cusKode?: string;
  }) => api.get(BASE, { params }),

  getSettingList: (params: {
    tahun: number;
    divisi: string;
    salesKode?: string;
    cusKode?: string;
  }) => api.get(`${BASE}/setting`, { params }),

  updateTarget: (kode: string, tahun: number, divisi: string, target: number) =>
    api.put(`${BASE}/setting/target`, { kode, tahun, divisi, target }),

  updateKodeSales: (kode: string, kodeSales: string) =>
    api.put(`${BASE}/setting/sales`, { kode, kodeSales }),
};
