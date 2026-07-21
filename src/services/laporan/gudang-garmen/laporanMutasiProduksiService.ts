import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/mutasi-prod-detail";

export const laporanMutasiProduksiService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    cab?: string;
    nomorSpk?: string;
    namaSpk?: string;
  }) => api.get(BASE, { params }),
};
