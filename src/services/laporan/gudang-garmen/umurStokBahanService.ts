import api from "@/services/api";

export const umurStokBahanService = {
  getBrowse: (params: { tanggal: string; kodeBahan?: string }) =>
    api.get("/laporan/gudang-garmen/umur-stok-bahan", { params }),
};
