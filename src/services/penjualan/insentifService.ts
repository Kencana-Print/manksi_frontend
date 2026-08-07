import api from "@/services/api";

const BASE_URL = "/penjualan/insentif";

export const insentifService = {
  getBrowseList: (params: { startDate: string; endDate: string }) =>
    api.get(BASE_URL, { params }),

  deleteData: (nomor: string) =>
    api.delete(`${BASE_URL}/${encodeURIComponent(nomor)}`),

  realisasiTransfer: (nomor: string, tanggalRealisasi: string) =>
    api.put(`${BASE_URL}/${encodeURIComponent(nomor)}/realisasi`, {
      tanggalRealisasi,
    }),
};
