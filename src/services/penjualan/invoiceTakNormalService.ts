import api from "@/services/api";

const BASE = "/penjualan/invoice-tak-normal";

export const invoiceTakNormalService = {
  getBrowse: (tglAwal: string, tglAkhir: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir } }),

  // Detail 1 — barang milik Invoice Tak Normal itu sendiri
  getBrowseDetailBarang: (tglAwal: string, tglAkhir: string, nomor = "") =>
    api.get(`${BASE}/detail-barang`, { params: { tglAwal, tglAkhir, nomor } }),

  // Detail 2 — daftar Invoice Normal yang dinaungi (via tinv_flag)
  getBrowseDetailInvoiceNormal: (nomor: string) =>
    api.get(`${BASE}/detail-invoice-normal`, { params: { nomor } }),

  cekBisaHapus: (nomor: string) =>
    api.get(`${BASE}/cek-hapus`, { params: { nomor } }),

  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),

  cekBisaCetak: (nomor: string) =>
    api.get(`${BASE}/cek-cetak`, { params: { nomor } }),

  cekBisaUbah: (nomor: string) =>
    api.get(`${BASE}/cek-ubah`, { params: { nomor } }),

  getPengajuanStatus: (nomor: string) =>
    api.get(`${BASE}/pengajuan-status`, { params: { nomor } }),

  cekPerluPengajuan: (nomor: string) =>
    api.get(`${BASE}/cek-perlu-pengajuan`, { params: { nomor } }),

  pengajuanUbah: (payload: any) => api.post(`${BASE}/pengajuan-ubah`, payload),

  getExportData: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir } }),

  getExportDetail: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir } }),
};
