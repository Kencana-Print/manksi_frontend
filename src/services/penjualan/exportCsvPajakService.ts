import api from "@/services/api";

const BASE = "/penjualan/export-csv-pajak";

export const exportCsvPajakService = {
  getBrowse: (
    tglAwal: string,
    tglAkhir: string,
    cusKode = "",
    perushKode = "",
    nomor = "",
  ) =>
    api.get(BASE, {
      params: { tglAwal, tglAkhir, cusKode, perushKode, nomor },
    }),

  getBrowseDetail: (nomor: string) =>
    api.get(`${BASE}/detail`, { params: { nomor } }),

  exportCsv: (payload: {
    tglAwal: string;
    tglAkhir: string;
    cusKode?: string;
    perushKode?: string;
    nomor?: string;
  }) => api.post(`${BASE}/export-csv`, payload, { responseType: "blob" }),

  exportXlsx: (payload: {
    tglAwal: string;
    tglAkhir: string;
    cusKode?: string;
    perushKode?: string;
    nomor?: string;
  }) => api.post(`${BASE}/export-xlsx`, payload, { responseType: "blob" }),
};
