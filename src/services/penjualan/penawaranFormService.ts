import api from "@/services/api";

export const penawaranFormService = {
  getById(nomor: string) {
    const safeNomor = encodeURIComponent(nomor);
    return api.get(`/penjualan/penawaran-form/${safeNomor}`);
  },

  save(data: any, isNewMode: boolean) {
    return api.post("/penjualan/penawaran-form/save", {
      isNewMode,
      data,
    });
  },

  getMintaHarga(nomorMh: string) {
    const safeNomor = encodeURIComponent(nomorMh);
    return api.get(`/penjualan/penawaran-form/minta-harga/${safeNomor}`);
  },
  uploadGambar(file: File) {
    const formData = new FormData();
    formData.append("gambar", file);
    // Jika perlu kirim data tambahan seperti Nomor Penawaran, bisa append di sini

    return api.post("/penjualan/penawaran-form/upload-gambar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
