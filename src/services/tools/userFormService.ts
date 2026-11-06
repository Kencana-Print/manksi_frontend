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

export interface CabangUserRow {
  cabang: string;
  divisi: number;
  utama: boolean;
}

export interface HrdKaryawan {
  nik: string;
  nama: string;
  pabrik: string;
  departemen: string;
  jabatan: string;
  bagian: string;
  aktif: boolean;
  userKode?: string;
  cabangHrd: string[];
}

export interface RoleItem {
  kode: string;
  nama: string;
  keterangan: string;
  sumber: string;
  aktif: boolean;
  anggota: number;
  jmlPerm: number;
}

export interface RoleMenuRow {
  menId: number;
  menUrut: number;
  keterangan: string;
  namaMenu: string;
  view: boolean;
  insert: boolean;
  edit: boolean;
  delete: boolean;
  save: boolean;
  dimiliki: {
    view: number;
    insert: number;
    edit: number;
    delete: number;
    save: number;
  };
}

export interface RoleDetail {
  kode: string;
  nama: string;
  keterangan: string;
  sumber: string;
  aktif: boolean;
  jmlAnggota: number;
  menu: RoleMenuRow[];
}

export interface RoleAnggota {
  kode: string;
  nama: string;
  sumber: string;
  bagian: string;
}

export interface PratinjauUser {
  kode: string;
  nama: string;
  jml: number;
}

export interface PratinjauRole {
  tambah: number;
  cabut: number;
  anggota: number;
  totalUserBertambah: number;
  totalUserBerkurang: number;
  userBertambah: PratinjauUser[];
  userBerkurang: PratinjauUser[];
}

export interface RolePayload {
  nama: string;
  keterangan: string;
  aktif: boolean;
  menu: RoleMenuRow[];
}

export const userFormService = {
  getFormData: (kode?: string) =>
    api.get(kode ? `${BASE}/${encodeURIComponent(kode)}` : BASE),
  checkKode: (kode: string) =>
    api.get(`${BASE}/check/${encodeURIComponent(kode)}`),
  searchUsers: (q: string) => api.get(`${BASE}/search`, { params: { q } }),
  searchNik: (q: string) => api.get(`${BASE}/nik`, { params: { q } }),
  getRoles: () =>
    api.get<{ success: boolean; data: RoleItem[] }>(`${BASE}/role`),
  getRole: (kode: string) =>
    api.get<{ success: boolean; data: RoleDetail }>(
      `${BASE}/role/${encodeURIComponent(kode)}`,
    ),
  getRoleAnggota: (kode: string) =>
    api.get<{ success: boolean; data: RoleAnggota[] }>(
      `${BASE}/role/${encodeURIComponent(kode)}/anggota`,
    ),
  pratinjauRole: (kode: string, payload: Pick<RolePayload, "aktif" | "menu">) =>
    api.post<{ success: boolean; data: PratinjauRole }>(
      `${BASE}/role/${encodeURIComponent(kode)}/pratinjau`,
      payload,
    ),
  saveRole: (kode: string, payload: RolePayload) =>
    api.put<{ success: boolean }>(
      `${BASE}/role/${encodeURIComponent(kode)}`,
      payload,
    ),
  getPermissionsForCopy: (kode: string) =>
    api.get(`${BASE}/permissions/${encodeURIComponent(kode)}`),
  getCabangOptions: () => api.get("/lookups/cabang-pabrik"), // ← BARU
  create: (payload: any) => api.post(BASE, payload),
  update: (kode: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(kode)}`, payload),
  delete: (kode: string) => api.delete(`${BASE}/${encodeURIComponent(kode)}`),
};
