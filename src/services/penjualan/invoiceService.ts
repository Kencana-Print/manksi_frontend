import api from "@/services/api";

const BASE = "/penjualan/invoice";

export const invoiceService = {
  getBrowse: (tglAwal: string, tglAkhir: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir } }),

  getBrowseDetail: (tglAwal: string, tglAkhir: string, nomor = "") =>
    api.get(`${BASE}/detail`, { params: { tglAwal, tglAkhir, nomor } }),

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

  getStatusInfo: (nomor: string) =>
    api.get(`${BASE}/status-info`, { params: { nomor } }),

  saveStatusUpdate: (nomor: string, payload: any) =>
    api.put(`${BASE}/status/${encodeURIComponent(nomor)}`, payload),

  getExportData: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir } }),

  getExportDetail: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir } }),
};
