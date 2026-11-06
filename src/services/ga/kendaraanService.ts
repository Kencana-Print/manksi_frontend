import api from "@/services/api";

export interface KendaraanRow {
  Nopol: string;
  Stat: string;
  Keterangan: string;
  Tahun?: string;
  Kondisi?: string;
  Kepemilikan?: string;
  Posisi?: string;
  Usr?: string;
  Jadwal_Servis: number;
  KmTerakhir: number;
  Pajak: string | null;
  Kir?: string | null;
  Aktif?: string;
}

export interface KendaraanFormData {
  nopol: string;
  stat: "INVENTARIS" | "PRIBADI";
  keterangan: string;
  tahun: string;
  kondisi: string;
  kepemilikan: string;
  posisi: string;
  usr: string;
  jadwal: number;
  kmterakhir: number;
  pajak: string;
  kir: string;
  aktif?: string;
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
