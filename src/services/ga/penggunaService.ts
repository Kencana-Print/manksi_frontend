import api from "@/services/api";

export interface PenggunaRow {
  Kode: string;
  Nama: string;
  Aktif?: number;
}

export interface PenggunaFormData {
  kode: string;
  nama: string;
}

export const penggunaService = {
  getAll: (params?: { search?: string }) =>
    api.get<{ success: boolean; data: PenggunaRow[] }>("/ga/master-pengguna", {
      params,
    }),

  getById: (kode: string) =>
    api.get<{ success: boolean; data: PenggunaRow }>(
      `/ga/master-pengguna/${encodeURIComponent(kode)}`,
    ),

  generateKode: () =>
    api.get<{ success: boolean; data: { kode: string } }>(
      "/ga/master-pengguna/generate-kode",
    ),

  create: (data: PenggunaFormData) =>
    api.post("/ga/master-pengguna", data),

  update: (kode: string, data: { nama: string }) =>
    api.put(`/ga/master-pengguna/${encodeURIComponent(kode)}`, data),

  deleteData: (kode: string) =>
    api.delete(`/ga/master-pengguna/${encodeURIComponent(kode)}`),
};
