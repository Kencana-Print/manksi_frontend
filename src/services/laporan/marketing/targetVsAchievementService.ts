import api from "@/services/api";

const BASE = "/laporan/marketing/target-vs-achievement";

export const targetVsAchievementService = {
  getBrowse: (
    tahun: string | number,
    bulanAwal: string | number,
    bulanAkhir: string | number,
  ) => api.get(BASE, { params: { tahun, bulanAwal, bulanAkhir } }),

  updateProyeksi: (
    tahun: string | number,
    bulan: string | number,
    pySales: number,
  ) => api.put(`${BASE}/proyeksi`, { tahun, bulan, pySales }),
};
