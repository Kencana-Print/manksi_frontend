import api from "@/services/api";

export const mppbFormService = {
  getDetail: (nomor: string) =>
    api.get(`/penjualan/mppb/form/${encodeURIComponent(nomor)}`),

  saveData: (payload: any) => {
    if (payload.nomor) return api.put("/penjualan/mppb/form", payload);
    return api.post("/penjualan/mppb/form", payload);
  },

  // Tambahan Fungsi Upload Gambar (Multipart/form-data)
  uploadGambar: (nomor: string, tipe: "desain" | "dokumen", file: File) => {
    const formData = new FormData();
    formData.append("nomor", nomor);
    formData.append("tipe", tipe); // Penentu nama file "-doc" atau biasa
    formData.append("image", file);

    return api.post("/penjualan/mppb/form/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
