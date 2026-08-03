import api from "@/services/api";

const BASE = "/garmen/bahan-jadi/cetak-bkbj";

export const cetakBkbjService = {
  getBrowse: (tglAwal: string, tglAkhir: string, gudang: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir, gudang } }),

  getExportData: (tglAwal: string, tglAkhir: string, gudang: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir, gudang } }),

  prosesCetak: (gudang: string, tanggal: string, expedisi: string) =>
    api.post(`${BASE}/cetak`, { gudang, tanggal, expedisi }),

  getPrintData: (gudang: string, tanggal: string, expedisi: string) =>
    api.get(`${BASE}/print-data`, { params: { gudang, tanggal, expedisi } }),
};
