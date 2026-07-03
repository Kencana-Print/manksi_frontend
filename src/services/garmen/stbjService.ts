import api from "@/services/api";

const BASE = "/garmen/stbj";

export const stbjService = {
  getBrowse: (tglAwal: string, tglAkhir: string, gudang: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir, gudang } }),

  getDetailByNomor: (nomor: string) =>
    api.get(`${BASE}/detail-by-nomor`, { params: { nomor } }),

  deleteData: (nomor: string) =>
    api.delete(`${BASE}/delete`, { data: { nomor } }),

  pengajuanUbah: (nomor: string, alasan: string) =>
    api.post(`${BASE}/pengajuan-ubah`, { nomor, alasan }),

  getExportData: (tglAwal: string, tglAkhir: string, gudang: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir, gudang } }),

  getExportDetail: (tglAwal: string, tglAkhir: string, gudang: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir, gudang } }),
};
