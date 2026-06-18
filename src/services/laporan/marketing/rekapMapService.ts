import api from "@/services/api";

export const rekapMapService = {
  getRekap: (params: { bulan?: number | string; tahun?: number | string }) =>
    api.get("/laporan/marketing/rekap-map/rekap", { params }),

  getDetail: (params: {
    bulan?: number | string;
    tahun?: number | string;
    divisi: string;
  }) => api.get("/laporan/marketing/rekap-map/detail", { params }),

  updateNote: (body: { nomor: string; note: string }) =>
    api.put("/laporan/marketing/rekap-map/update-note", body),
};
