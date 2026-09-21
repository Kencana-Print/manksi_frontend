import api from "@/services/api";

export const maklonBarangService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    keyword?: string;
  }) => api.get("/garmen/maklon/makloon-barang/browse", { params }),
  getDetail: (nomor: string) =>
    api.get(`/garmen/maklon/makloon-barang/${encodeURIComponent(nomor)}`),
  getPrintData: (nomor: string) =>
    api.get(`/garmen/maklon/makloon-barang/print/${encodeURIComponent(nomor)}`),
};
