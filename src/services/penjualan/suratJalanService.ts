import api from "@/services/api";

const BASE = "/penjualan/surat-jalan";

export const suratJalanService = {
  getBrowse: (tglAwal: string, tglAkhir: string, divisi = 0) =>
    api.get(BASE, { params: { tglAwal, tglAkhir, divisi } }),

  getBrowseDetail: (tglAwal: string, tglAkhir: string, nomor = "") =>
    api.get(`${BASE}/detail`, { params: { tglAwal, tglAkhir, nomor } }),

  cekBisaHapusUbah: (nomor: string) =>
    api.get(`${BASE}/cek-hapus`, { params: { nomor } }),

  deleteData: (nomor: string) =>
    api.delete(`${BASE}/delete`, { data: { nomor } }),

  getPengajuanStatus: (nomor: string) =>
    api.get(`${BASE}/pengajuan-status`, { params: { nomor } }),

  pengajuanUbah: (body: object) => api.post(`${BASE}/pengajuan-ubah`, body),

  cekSjKemarinBelumApprove: () => api.get(`${BASE}/cek-kemarin`),

  cekPerluPengajuan: (nomor: string) =>
    api.get(`${BASE}/cek-perlu-pengajuan`, { params: { nomor } }),

  getExportData: (tglAwal: string, tglAkhir: string, divisi = 0) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir, divisi } }),

  getExportDetail: (tglAwal: string, tglAkhir: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir } }),
};
