import api from "@/services/api";

const BASE = "/tools/user-form";

export interface MenuGridRow {
  menId: number;
  menUrut: number;
  keterangan: string;
  namaMenu: string;
  isNewMenu: boolean;
  view: boolean;
  insert: boolean;
  edit: boolean;
  delete: boolean;
  save: boolean;
}

export interface UserHeader {
  kode: string;
  nama: string;
  password: string;
  divisi: number;
  aktif: boolean;
  editReport: boolean;
  lihatBeli: boolean;
  lihatHarga: boolean;
  lihatCustomer: boolean;
  lihatSupplier: boolean;
}

export const userFormService = {
  getFormData: (kode?: string) =>
    api.get(kode ? `${BASE}/${encodeURIComponent(kode)}` : BASE),
  checkKode: (kode: string) =>
    api.get(`${BASE}/check/${encodeURIComponent(kode)}`),
  searchUsers: (q: string) => api.get(`${BASE}/search`, { params: { q } }),
  getPermissionsForCopy: (kode: string) =>
    api.get(`${BASE}/permissions/${encodeURIComponent(kode)}`),
  getCabangOptions: () => api.get("/lookups/cabang-pabrik"), // ← BARU
  create: (payload: any) => api.post(BASE, payload),
  update: (kode: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(kode)}`, payload),
  delete: (kode: string) => api.delete(`${BASE}/${encodeURIComponent(kode)}`),
};
