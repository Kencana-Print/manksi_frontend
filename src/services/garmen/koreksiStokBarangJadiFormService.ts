import api from "@/services/api";

export const koreksiStokBarangJadiFormService = {
  getFormData: (nomor: string) =>
    api.get(
      `/garmen/bahan-jadi/koreksi-stok/form/${encodeURIComponent(nomor)}`,
    ),

  validateGudang: (kode: string) =>
    api.get(
      `/garmen/bahan-jadi/koreksi-stok/form/gudang/${encodeURIComponent(kode)}`,
    ),

  resolveKode: (
    kode: string,
    gdgKode: string,
    tanggal: string,
    excludeNomor = "",
  ) =>
    api.get(
      `/garmen/bahan-jadi/koreksi-stok/form/barang/${encodeURIComponent(kode)}`,
      {
        params: { gdgKode, tanggal, excludeNomor },
      },
    ),

  searchBarang: (q: string, gdgKode: string, page: number, limit: number) =>
    api.get("/garmen/bahan-jadi/koreksi-stok/form/barang-list", {
      params: { q, gdgKode, page, limit },
    }),

  create: (payload: any) =>
    api.post("/garmen/bahan-jadi/koreksi-stok/form", payload),

  update: (nomor: string, payload: any) =>
    api.put(
      `/garmen/bahan-jadi/koreksi-stok/form/${encodeURIComponent(nomor)}`,
      payload,
    ),
};
