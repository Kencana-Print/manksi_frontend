import api from "@/services/api";

export const cekGagalLinkService = {
  getBrowse: () => api.get("/laporan/piutang/cek-gagal-link"),

  getBrowseDetail: (nota: string) =>
    api.get(
      `/laporan/piutang/cek-gagal-link/${encodeURIComponent(nota)}/detail`,
    ),

  fixLink: (nota: string, bayar: number) =>
    api.put(`/laporan/piutang/cek-gagal-link/${encodeURIComponent(nota)}/fix`, {
      bayar,
    }),
};
