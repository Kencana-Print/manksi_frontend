import api from "@/services/api";

const BASE = "/penjualan/sj-tak-normal";

export const sjTakNormalService = {
  getBrowse: (tglAwal: string, tglAkhir: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir } }),

  getBrowseDetail: (tglAwal: string, tglAkhir: string, nomor = "") =>
    api.get(`${BASE}/detail`, { params: { tglAwal, tglAkhir, nomor } }),

  cekBisaUbah: (nomor: string) =>
    api.get(`${BASE}/cek-ubah`, { params: { nomor } }),

  cekBisaHapus: (nomor: string) =>
    api.get(`${BASE}/cek-hapus`, { params: { nomor } }),

  cekBisaCetak: (nomor: string) =>
    api.get(`${BASE}/cek-cetak`, { params: { nomor } }),

  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),

  getExportData: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir } }),

  getExportDetail: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir } }),
};
