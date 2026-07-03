import api from "@/services/api";

export const jadwalKirimFormService = {
  generateNomor: (tanggal: string) =>
    api.get("/penjualan/jadwal-kirim-form/generate-nomor", {
      params: { tanggal },
    }),

  getSpkInfo: (nomor: string, divisiUser: number) =>
    api.get("/penjualan/jadwal-kirim-form/spk-info", {
      params: { nomor, divisiUser },
    }),

  getSudahDijadwalkan: (nomorSpk: string, excludeNomor = "") =>
    api.get("/penjualan/jadwal-kirim-form/sudah-dijadwalkan", {
      params: { nomorSpk, excludeNomor },
    }),

  getPlanningPpic: (nomorSpk: string) =>
    api.get("/penjualan/jadwal-kirim-form/planning-ppic", {
      params: { nomorSpk },
    }),

  cekDuplikatKota: (nomorSpk: string, kota: string, excludeNomor = "") =>
    api.get("/penjualan/jadwal-kirim-form/cek-kota", {
      params: { nomorSpk, kota, excludeNomor },
    }),

  cekJadwalByTanggal: (nomorSpk: string, tanggal: string) =>
    api.get("/penjualan/jadwal-kirim-form/cek-jadwal-tanggal", {
      params: { nomorSpk, tanggal },
    }),

  searchSpk: (q: string, divisiUser: number, page = 1, limit = 30) =>
    api.get("/penjualan/jadwal-kirim-form/search-spk", {
      params: { q, divisiUser, page, limit },
    }),

  getById: (nomor: string) =>
    api.get(`/penjualan/jadwal-kirim-form/${encodeURIComponent(nomor)}`),

  save: (data: any) => api.post("/penjualan/jadwal-kirim-form", data),

  update: (nomor: string, data: any) =>
    api.put(`/penjualan/jadwal-kirim-form/${encodeURIComponent(nomor)}`, data),
};
