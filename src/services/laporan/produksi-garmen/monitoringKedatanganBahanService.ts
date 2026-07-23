import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/monitoring-bhn-datang";

export const monitoringKedatanganBahanService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    cab = "P04",
    mapSpk = "ALL",
    ket = "",
  ) => api.get(BASE, { params: { startDate, endDate, cab, mapSpk, ket } }),

  getDetail: (spk: string, tglMinta: string, cab = "P04") =>
    api.get(
      `${BASE}/${encodeURIComponent(spk)}/${encodeURIComponent(tglMinta)}`,
      { params: { cab } },
    ),

  getAllDetail: (
    startDate: string,
    endDate: string,
    cab = "P04",
    mapSpk = "ALL",
    ket = "",
  ) =>
    api.get(`${BASE}/all-detail`, {
      params: { startDate, endDate, cab, mapSpk, ket },
    }),

  getFlattenedRows: (
    startDate: string,
    endDate: string,
    cab = "P04",
    mapSpk = "ALL",
    ket = "",
  ) =>
    api.get(`${BASE}/flattened`, {
      params: { startDate, endDate, cab, mapSpk, ket },
    }),
};
