import api from "@/services/api";

export interface PerawatanRow {
  Nomor: string;
  Tanggal: string;
  Bengkel: string;
  Keterangan: string;
  NoPolisi: string;
  Stat: string;
  KM: number;
  NamaKendaraan: string;
  TotalBiaya: number;
}

export interface PerawatanDetailRow {
  Nomor: string;
  No_urut: number;
  Nama: string;
  Satuan: string;
  Qty: number;
  Nominal: number;
  Total: number;
  TglBeli: string | null;
}

export interface PerawatanDetailItem {
  id?: number | null;
  nama: string;
  satuan: string;
  qty: number;
  nominal: number;
  total?: number;
  tglBeli: string;
}

export interface PerawatanFormData {
  nomor?: string;
  tanggal: string;
  bengkel: string;
  keterangan: string;
  nopol: string;
  km: number;
  stat?: string;
  namaKendaraan?: string;
  items: PerawatanDetailItem[];
}

export const perawatanService = {
  getBrowse: (params: { tglAwal: string; tglAkhir: string }) =>
    api.get<{ success: boolean; data: PerawatanRow[] }>("/ga/perawatan", {
      params,
    }),

  getDetail: (nomor: string) =>
    api.get<{ success: boolean; data: PerawatanDetailRow[] }>(
      `/ga/perawatan/${encodeURIComponent(nomor)}/detail`,
    ),

  getById: (nomor: string) =>
    api.get<{
      success: boolean;
      data: {
        nomor: string;
        tanggal: string;
        bengkel: string;
        keterangan: string;
        nopol: string;
        km: number;
        stat: string;
        namaKendaraan: string;
        items: PerawatanDetailRow[];
      };
    }>(`/ga/perawatan/${encodeURIComponent(nomor)}`),

  generateNomor: (tanggal: string) =>
    api.get<{ success: boolean; data: { nomor: string } }>(
      "/ga/perawatan/generate-nomor",
      { params: { tanggal } },
    ),

  searchKendaraan: (q: string) =>
    api.get<{
      success: boolean;
      data: Array<{
        Nopol: string;
        Stat: string;
        Keterangan: string;
        KmTerakhir: number;
      }>;
    }>("/ga/perawatan/search-kendaraan", { params: { q } }),

  create: (data: PerawatanFormData) =>
    api.post("/ga/perawatan", data),

  update: (nomor: string, data: PerawatanFormData) =>
    api.put(`/ga/perawatan/${encodeURIComponent(nomor)}`, data),

  deleteData: (nomor: string) =>
    api.delete(`/ga/perawatan/${encodeURIComponent(nomor)}`),
};
