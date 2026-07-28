import api from "@/services/api";

const BASE = "/garmen/po-internal-spk/sj-po-internal-form";

export const sjPoInternalSpkFormService = {
  checkPO: (nomor: string) =>
    api.get(`${BASE}/check-po`, { params: { nomor } }),

  checkSpk: (nomor: string) =>
    api.get(`${BASE}/check-spk`, { params: { nomor } }),

  checkNoMaterial: (
    noMaterial: string,
    kodeKain: string,
    excludeNomor: string,
  ) =>
    api.get(`${BASE}/check-no-material`, {
      params: { noMaterial, kodeKain, excludeNomor },
    }),

  checkGudangProduksi: (kode: string, cabang?: string) =>
    api.get(`${BASE}/check-gudang-produksi`, { params: { kode, cabang } }),

  getKomponenOptions: (nomorSpk: string) =>
    api.get(`${BASE}/komponen-options`, { params: { nomorSpk } }),

  getKelompokOptions: (jasaNama: string, cabang: string) =>
    api.get(`${BASE}/kelompok-options`, { params: { jasaNama, cabang } }),

  getBabaranStandar: (nomorSpk: string, komponen: string) =>
    api.get(`${BASE}/babaran-standar`, { params: { nomorSpk, komponen } }),

  getKelompokTujuanOptions: (liniTujuan: string, cab: string) =>
    api.get(`${BASE}/kelompok-tujuan-options`, { params: { liniTujuan, cab } }),

  checkSupplier: (kode: string) =>
    api.get(`${BASE}/check-supplier`, { params: { kode } }),

  loadBahan: (payload: {
    kode: string;
    nomorSpk: string;
    existingRows?: { kode: string; size: string }[];
  }) => api.post(`${BASE}/load-bahan`, payload),

  getById: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  save: (payload: any) => api.post(`${BASE}/save`, payload),

  getPrintData: (nomor: string) =>
    api.get(`${BASE}/print/${encodeURIComponent(nomor)}`),
};
