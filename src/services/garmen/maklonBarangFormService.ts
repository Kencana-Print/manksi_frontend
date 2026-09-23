import api from "@/services/api";

const BASE = "/garmen/maklon/makloon-barang";

export const maklonBarangFormService = {
  getById: (nomor: string) => api.get(`${BASE}/form/${nomor}`),
  // ⬅ DIUBAH: save sekarang selalu kirim FormData (header + details JSON,
  // plus file gambar mentah yang belum ke-upload). uploadGambar terpisah
  // (di bawah) TIDAK lagi dipakai dari form ini — dibiarkan ada untuk
  // backward-compat kalau ada pemakai lain, tapi alur baru upload gambar
  // menyatu dengan save.
  save: (formData: FormData) =>
    api.post(`${BASE}/form/save`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadGambar: (files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append("images", f));
    return api.post(`${BASE}/form/upload-gambar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getCabangOptions: () => api.get(`${BASE}/form/cabang-options`),
  getSjKeluarDialog: (nomor: string) =>
    api.get(`${BASE}/form/${nomor}/sj-keluar-dialog`),
  createSjKeluar: (
    nomor: string,
    payload: { tanggal: string; items: { mkld_id: number; qty: number }[] },
  ) => api.post(`${BASE}/form/${nomor}/sj-keluar`, payload),
  getSjKeluarPrintData: (sjkNomor: string) =>
    api.get(`${BASE}/form/sj-keluar/${sjkNomor}/print`),
};
