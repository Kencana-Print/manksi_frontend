import api from "@/services/api";

const BASE = "/garmen/barang/koreksi-stok/form";

export const koreksiStokFormService = {
  getFormData: (nomor: string) =>
    api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  create: (payload: any) => api.post(BASE, payload),

  update: (nomor: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),

  resolveKode: (
    jenis: string,
    kode: string,
    cabang: string,
    tanggal: string,
    currentNomor?: string,
  ) =>
    api.get(`${BASE}/resolve-kode`, {
      params: {
        jenis,
        kode,
        cabang,
        tanggal,
        currentNomor: currentNomor || undefined,
      },
    }),

  searchBarang: (
    jenis: string,
    cabang: string,
    keyword: string,
    page: number,
    limit: number,
  ) =>
    api.get(`${BASE}/search-barang`, {
      params: { jenis, cabang, keyword: keyword || undefined, page, limit },
    }),

  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/cetak/${encodeURIComponent(nomor)}`),
};
