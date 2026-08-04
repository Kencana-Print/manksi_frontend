import api from "@/services/api";

const BASE = "/garmen/barang/retur-barang/form";

export const returBarangFormService = {
  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  create: (payload: any) => api.post(BASE, payload),

  update: (nomor: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),

  searchRealisasiHeader: (
    jenis: string,
    keyword: string,
    page: number,
    limit: number,
  ) =>
    api.get(`${BASE}/search-realisasi-header`, {
      params: { jenis, keyword: keyword || undefined, page, limit },
    }),

  searchRealisasiDetail: (
    jenis: string,
    nomorRealisasi: string,
    currentNomor?: string,
  ) =>
    api.get(`${BASE}/search-realisasi-detail`, {
      params: {
        jenis,
        nomorRealisasi,
        currentNomor: currentNomor || undefined,
      },
    }),

  searchBarang: (jenis: string, keyword: string, page: number, limit: number) =>
    api.get(`${BASE}/search-barang`, {
      params: { jenis, keyword: keyword || undefined, page, limit },
    }),
};
