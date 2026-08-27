import api from "@/services/api";

export const spkGudangFormService = {
  getById: (nomor: string) =>
    api.get(`/garmen/spk-gudang/form/${encodeURIComponent(nomor)}`),
  lookupJenisKain: (kode: string) =>
    api.get(
      `/garmen/spk-gudang/form/lookup-jenis-kain/${encodeURIComponent(kode)}`,
    ),
  searchBarcode: (kdKain: string, q = "") =>
    api.get("/garmen/spk-gudang/form/search-barcode", {
      params: { kdKain, q },
    }),
  resolveBarcode: (kdKain: string, barcode: string) =>
    api.get("/garmen/spk-gudang/form/resolve-barcode", {
      params: { kdKain, barcode },
    }),
  searchBahan: (kdKain: string, q = "") =>
    api.get("/garmen/spk-gudang/form/search-bahan", { params: { kdKain, q } }),
  lookupWarna: (kode: string) =>
    api.get("/garmen/spk-gudang/form/lookup-warna", { params: { kode } }),
  searchJenisKainKaosan: (q = "", page = 1, limit = 50) =>
    api.get("/garmen/spk-gudang/form/search-jenis-kain-kaosan", {
      params: { q, page, limit },
    }),
  searchWarna: (q = "", page = 1, limit = 50) =>
    api.get("/garmen/spk-gudang/form/search-warna", {
      params: { q, page, limit },
    }),
  searchJenisKain: (q = "", page = 1, limit = 50) =>
    api.get("/garmen/spk-gudang/form/search-jenis-kain", {
      params: { q, page, limit },
    }),
  getLenganList: () => api.get("/garmen/spk-gudang/form/lengan-list"),
  getDataCetak: (nomor: string) =>
    api.get(`/garmen/spk-gudang/form/cetak/${encodeURIComponent(nomor)}`),
  save: (payload: any) => api.post("/garmen/spk-gudang/form", payload),
};
