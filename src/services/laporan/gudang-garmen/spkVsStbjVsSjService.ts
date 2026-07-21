import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/spk-vs-stbj-vs-sj";

export const spkVsStbjVsSjService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    spk = "",
    perusahaan = "",
    status = "ALL",
    divisi = "ALL",
    isMap = false,
  ) =>
    api.get(BASE, {
      params: {
        startDate,
        endDate,
        spk,
        perusahaan,
        status,
        divisi,
        map: isMap,
      },
    }),

  getDetail: (spk: string) => api.get(`${BASE}/${encodeURIComponent(spk)}`),

  getAllDetail: (
    startDate: string,
    endDate: string,
    spk = "",
    perusahaan = "",
    status = "ALL",
    divisi = "ALL",
    isMap = false,
  ) =>
    api.get(`${BASE}/all-detail`, {
      params: {
        startDate,
        endDate,
        spk,
        perusahaan,
        status,
        divisi,
        map: isMap,
      },
    }),
};
