import api from "@/services/api";

const BASE = "/penjualan/surat-jalan-form";
const LOOKUP = "/lookups";

export const sjFormService = {
  getById: (nomor: string) => api.get(BASE, { params: { nomor } }),

  save: (data: any) => api.post(BASE, data),
  update: (data: any) => api.put(BASE, data),

  getSpkDetail: (
    spkNomor: string,
    cusKode: string,
    divisi: string | number,
    excludeNomor = "",
    existingSpkNomors: string[] = [],
  ) =>
    api.post(`${BASE}/spk-detail`, {
      spkNomor,
      cusKode,
      divisi,
      excludeNomor,
      existingSpkNomors,
    }),

  getSpkList: (
    cusKode: string,
    perushKode: string,
    divisi: string | number,
    invPro = "",
    q = "",
  ) =>
    api.get(`${BASE}/spk-list`, {
      params: { cusKode, perushKode, divisi, invPro, q },
    }),

  getJadwalKirimList: (
    cusKode: string,
    perushKode: string,
    divisi: string | number,
    invPro = "",
    q = "",
  ) =>
    api.get(`${BASE}/jadwal-kirim`, {
      params: { cusKode, perushKode, divisi, invPro, q },
    }),

  cekPiutang: (spkNomor: string, cusKode: string) =>
    api.get(`${BASE}/cek-piutang`, { params: { spkNomor, cusKode } }),

  getAlokasiHistory: (cusKode: string) =>
    api.get(`${BASE}/alokasi-history`, { params: { cusKode } }),

  getAlokasiSpk: (spkNomor: string) =>
    api.get(`${BASE}/alokasi-spk`, { params: { spkNomor } }),

  getDivisiList: () => api.get(`${BASE}/divisi`),

  getInvProformaList: (cusKode = "", q = "") =>
    api.get(`${BASE}/inv-proforma`, { params: { cusKode, q } }),

  getRekeningPerush: (perushKode: string) =>
    api.get(`${BASE}/rekening`, { params: { perushKode } }),

  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/cetak`, { params: { nomor } }),

  getKodeOtorisasi: () => api.get(`${BASE}/kode-otorisasi`),

  submitOtorisasi: (spkNomor: string, kodeOtorisasi: string, jawaban: string) =>
    api.post(`${BASE}/otorisasi`, { spkNomor, kodeOtorisasi, jawaban }),

  // Lookups yang sudah ada
  searchPerusahaan: (q = "") =>
    api.get(`${LOOKUP}/perusahaan`, { params: { q } }),

  searchCustomer: (q = "", page = 1, limit = 50) =>
    api.get(`${LOOKUP}/customer`, { params: { q, page, limit } }),
};
