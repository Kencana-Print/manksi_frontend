import api from "@/services/api";

export const mintaBahanFormService = {
  // 1. Mengambil info SPK (Jika menggunakan mode SUBLIM / SPK MMT)
  getSpkInfo: (spk: string, cabang: string, keterangan: string) =>
    api.get(`/mmt/permintaan-produksi-bahan/minta-bahan/${encodeURIComponent(spk)}`, {
      params: { cabang, keterangan },
    }),

  // 2. Mengambil detail data berdasarkan nomor dokumen untuk EDIT MODE
  // Sesuai route backend: router.get('/:nomor', ...)
  getDetail: (nomor: string) =>
    api.get(`/mmt/permintaan-produksi-bahan/${encodeURIComponent(nomor)}`),

  // 3. Menyimpan data baru (POST) atau memperbarui data lama (PUT)
  // Sesuai route backend: router.post('/', ...) dan router.put('/', ...)
  saveData: (payload: any, nomor?: string) => {
    // Sisipkan flag edit mode secara transparan ke payload
    const finalPayload = {
      ...payload,
      isEditMode: !!nomor,
      nomor: nomor || payload.nomor || ""
    };

    if (nomor) {
      return api.put("/mmt/permintaan-produksi-bahan", finalPayload);
    }
    return api.post("/mmt/permintaan-produksi-bahan", finalPayload);
  },
  // 4. Mengambil data untuk cetakan / print dokumen
  getPrintData: (nomor: string) =>
    api.get(`/mmt/permintaan-produksi-bahan/print/${encodeURIComponent(nomor)}`),
};