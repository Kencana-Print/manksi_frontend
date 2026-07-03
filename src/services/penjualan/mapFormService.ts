import api from "@/services/api";

export const mapFormService = {
  getInitGrids() {
    return api.get(`/penjualan/map-form/init-grids`);
  },

  getSpkInformasi(divisi: string) {
    return api.get(
      `/penjualan/map-form/spk-informasi/${encodeURIComponent(divisi)}`,
    );
  },

  loadMintaHarga(nomorMh: string) {
    return api.get(
      `/penjualan/map-form/load-minta-harga/${encodeURIComponent(nomorMh)}`,
    );
  },

  getNamaSuggestions: (q: string, divisi: string, cusKode: string) =>
    api.get("/penjualan/map-form/nama-suggestions", {
      params: { q, divisi, cusKode },
    }),

  checkDuplikatNama: (
    nama: string,
    divisi: string,
    cusKode: string,
    excludeNomor = "",
  ) =>
    api.get("/penjualan/map-form/check-duplikat", {
      params: { nama, divisi, cusKode, excludeNomor },
    }),

  getKatalogCustomer(
    cusKode: string,
    divisi: string = "",
    keyword: string = "",
    page: number = 1,
    limit: number = 20,
  ) {
    return api.get(`/penjualan/map-form/katalog/customer/${cusKode}`, {
      params: { divisi, q: keyword, page, limit },
    });
  },

  getById(nomor: string) {
    const safeNomor = encodeURIComponent(nomor);
    return api.get(`/penjualan/map-form/${safeNomor}`);
  },

  save(data: any, isNewMode: boolean) {
    // Karena logic save backend menuntut seluruh data, kita kirim semuanya
    return api.post("/penjualan/map-form/save", data);
  },

  uploadGambar(
    file: File,
    mapNomor: string,
    cabang: string,
    type: "MAIN" | "EMAIL",
  ) {
    const formData = new FormData();
    formData.append("gambar", file);
    formData.append("mapNomor", mapNomor);
    formData.append("cabang", cabang);
    formData.append("type", type); // 'MAIN' untuk gambar desain, 'EMAIL' untuk screenshot

    return api.post("/penjualan/map-form/upload-gambar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
};
