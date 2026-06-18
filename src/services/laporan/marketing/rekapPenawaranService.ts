import api from "@/services/api";

export const rekapPenawaranService = {
  getRekap: (params: { bulan?: number | string; tahun?: number | string }) =>
    api.get("/laporan/marketing/rekap-penawaran/rekap", { params }),

  getDetail: (params: {
    bulan?: number | string;
    tahun?: number | string;
    divisi: string;
  }) => api.get("/laporan/marketing/rekap-penawaran/detail", { params }),
};
