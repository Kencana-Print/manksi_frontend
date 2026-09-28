import api from "@/services/api";

export const accountService = {
  getAll: () => api.get("/master/account"),
  getById: (kode: string) =>
    api.get(`/master/account/${encodeURIComponent(kode)}`),
  getKelompok: () => api.get("/master/account/kelompok"),
  getCabang: () => api.get("/master/account/cabang"),
  save: (payload: {
    isEdit: boolean;
    kode: string;
    nama: string;
    no_rekening?: string;
    kol_id: string | number;
    cabang?: string;
    store?: string;
    keterangan?: string;
    is_aktif: boolean;
  }) => api.post("/master/account", payload),
  delete: (kode: string) =>
    api.delete(`/master/account/${encodeURIComponent(kode)}`),
};
