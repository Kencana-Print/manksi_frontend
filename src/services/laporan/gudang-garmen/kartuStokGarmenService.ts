import api from "@/services/api";

export const kartuStokGarmenService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    cabang: string;
    jenis: string;
    barang: string;
  }) => api.get("/laporan/gudang-garmen/kartu-stok-barang", { params }),

  getBrowseDetail: (
    kode: string,
    params: {
      startDate: string;
      endDate: string;
      cabang: string;
      jenis: string;
    },
  ) =>
    api.get(
      `/laporan/gudang-garmen/kartu-stok-barang/${encodeURIComponent(kode)}/detail`,
      { params },
    ),
};
