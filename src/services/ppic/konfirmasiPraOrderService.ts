import api from "@/services/api";

export const konfirmasiPraOrderService = {
  getBrowse: (params: {
    startDate?: string;
    endDate?: string;
    divisi?: string;
    status?: string;
  }) => api.get("/ppic/konfirmasi-pra-order", { params }),

  getDivisi: () => api.get("/ppic/konfirmasi-pra-order/divisi"),

  getDetail: (nomor: string) =>
    api.get(`/ppic/konfirmasi-pra-order/${encodeURIComponent(nomor)}`),

  confirmKesanggupan: (nomor: string, status: string, catatan: string) =>
    api.patch(
      `/ppic/konfirmasi-pra-order/${encodeURIComponent(nomor)}/konfirmasi`,
      { status, catatan },
    ),

  confirmStatusBahan: (probId: number, status: string) =>
    api.patch(`/ppic/konfirmasi-pra-order/bahan/${probId}/status`, {
      status,
    }),
};
