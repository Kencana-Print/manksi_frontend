import api from "@/services/api";

export const penawaranService = {
  getBrowseList(params: {
    startDate: string;
    endDate: string;
    status: string;
  }) {
    return api.get("/penjualan/penawaran/browse", { params });
  },

  getBrowseDetail(nomor: string) {
    // ENCODE NOMOR DI SINI
    const safeNomor = encodeURIComponent(nomor);
    return api.get(`/penjualan/penawaran/browse/detail/${safeNomor}`);
  },

  deletePenawaran(nomor: string) {
    // ENCODE NOMOR DI SINI
    const safeNomor = encodeURIComponent(nomor);
    return api.delete(`/penjualan/penawaran/${safeNomor}`);
  },

  updateStatus(nomor: string, details: any[]) {
    // ENCODE NOMOR DI SINI
    const safeNomor = encodeURIComponent(nomor);
    return api.put(`/penjualan/penawaran/status/${safeNomor}`, { details });
  },
};
