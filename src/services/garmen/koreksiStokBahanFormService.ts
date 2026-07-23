import api from "@/services/api";

export const koreksiStokBahanFormService = {
  getDefault: () => api.get("/garmen/bahan-baku/koreksi-stok/form/default"),

  getFormData: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/koreksi-stok/form/${encodeURIComponent(nomor)}`,
    ),

  getGudang: (kode: string) =>
    api.get(
      `/garmen/bahan-baku/koreksi-stok/form/gudang/${encodeURIComponent(kode)}`,
    ),

  getBarang: (
    kode: string,
    params: { gdgKode: string; tanggal: string; nomorSedangDiedit?: string },
  ) =>
    api.get(
      `/garmen/bahan-baku/koreksi-stok/form/barang/${encodeURIComponent(kode)}`,
      {
        params,
      },
    ),

  create: (payload: any) =>
    api.post("/garmen/bahan-baku/koreksi-stok/form", payload),

  update: (nomor: string, payload: any) =>
    api.put(
      `/garmen/bahan-baku/koreksi-stok/form/${encodeURIComponent(nomor)}`,
      payload,
    ),
};
