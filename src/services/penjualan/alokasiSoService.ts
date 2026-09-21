import api from "@/services/api";

export const alokasiSoService = {
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    divisi?: string;
  }) => api.get("/penjualan/alokasi-so/browse", { params }),

  getAlokasi: (nomor: string) =>
    api.get(`/penjualan/alokasi-so/${encodeURIComponent(nomor)}`),

  saveAlokasi: (nomor: string, rows: any[]) =>
    api.post(`/penjualan/alokasi-so/${encodeURIComponent(nomor)}`, { rows }),
};
