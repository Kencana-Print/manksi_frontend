import api from "@/services/api";

export const FormLhkDesainService = {
  /**
   * 1. Mengambil data gabungan LHK Desain (Header, Status, Komponen, Bordir) berdasarkan nomor SPK/MAP
   * Digunakan saat onBlur / memilih SPK dari modal bantuan di halaman input baru
   */
  getLoadAll: (nomorSpk: string) =>
    api.get(`/mmt/lhk-desain/load-all/${encodeURIComponent(nomorSpk)}`),

  /**
   * 2. Mengambil detail data berdasarkan nomor dokumen untuk EDIT MODE (jika route dibedakan)
   * Mengarah ke endpoint load-all karena form LHK Desain menganut sistem Single SPK/MAP key
   */
  getDetail: (nomorSpk: string) =>
    api.get(`/mmt/lhk-desain/load-all/${encodeURIComponent(nomorSpk)}`),

  /**
   * 3. Menyimpan data baru atau memperbarui data lama via POST Multipart Form Data
   * Karena payload membawa file binary gambar screenshot, pengiriman menggunakan objek FormData
   */
  saveData: (payload: FormData) => {
    return api.post("/mmt/lhk-desain/save", payload, {
      headers: { 
        "Content-Type": "multipart/form-data" 
      },
    });
  },

  /**
   * 4. Validasi komponen bahan / mencari nama barang berdasarkan kode secara instan (onBlur / F1 di grid)
   */
  validateBahan: (kode: string, output: string) =>
    api.get("/mmt/lhk-desain/validate-bahan", {
      params: { kode, output },
    }),

  /**
   * 5. Mengambil data terformat khusus untuk cetakan atau print dokumen LHK Desain
   */
  getPrintData: (nomorSpk: string) =>
    api.get(`/mmt/lhk-desain/print/${encodeURIComponent(nomorSpk)}`),
};