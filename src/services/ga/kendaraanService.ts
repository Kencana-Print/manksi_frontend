import api from "@/services/api";

export interface KendaraanRow {
  Nopol: string;
  Stat: string;
  Keterangan: string;
  Jadwal_Servis: number;
  KmTerakhir: number;
  Pajak: string | null;
}

export interface KendaraanFormData {
  nopol: string;
  stat: "INVENTARIS" | "PRIBADI";
  keterangan: string;
  jadwal: number;
  kmterakhir: number;
  pajak: string;
}

export const kendaraanService = {
  getAll: (params?: { search?: string }) =>
    api.get<{ success: boolean; data: KendaraanRow[] }>("/ga/master-kendaraan", {
      params,
    }),

  getById: (nopol: string) =>
    api.get<{ success: boolean; data: KendaraanRow }>(
      `/ga/master-kendaraan/${encodeURIComponent(nopol)}`,
    ),

  create: (data: KendaraanFormData) =>
    api.post("/ga/master-kendaraan", data),

  update: (nopol: string, data: KendaraanFormData) =>
    api.put(`/ga/master-kendaraan/${encodeURIComponent(nopol)}`, data),

  deleteData: (nopol: string) =>
    api.delete(`/ga/master-kendaraan/${encodeURIComponent(nopol)}`),
};
