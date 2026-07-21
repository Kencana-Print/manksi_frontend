import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/realisasi-minta-vs-lhk-cutt";

export const realisasiMintaVsLhkCuttService = {
  getBrowse: (startDate: string, endDate: string, cab = "ALL", spk = "") =>
    api.get(BASE, { params: { startDate, endDate, cab, spk } }),

  // id = "{Nomor} {Kode}" (master key gabungan, persis format Id di backend)
  getDetail: (id: string) => api.get(`${BASE}/${encodeURIComponent(id)}`),

  getAllDetail: (startDate: string, endDate: string, cab = "ALL", spk = "") =>
    api.get(`${BASE}/all-detail`, { params: { startDate, endDate, cab, spk } }),
};
