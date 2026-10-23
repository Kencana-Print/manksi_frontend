import api from "@/services/api";

export interface PermintaanDriverRow {
  Nomor: string;
  Tanggal: string;
  Jam_Minta: string;
  Peminta: string;
  Pengambilan: string;
  Customer: string;
  PIC: string;
  Uraian: string;
  Status: string;
  Tipe: string;
  TglKerja: string;
  JamKerja: string;
  IsClosed: string;
  pd_isclosed: number;
  pd_iscancel: number;
  Driver: string;
  Hari_Kerja: string;
}

export interface PermintaanDriverDetailRow {
  Nomor: string;
  No_urut: number;
  SPK: string;
  Keterangan: string;
  Penerima: string;
}

export interface PermintaanDriverDetailItem {
  id?: number | null;
  no?: number;
  spk: string;
  keterangan: string;
  penerima: string;
}

export interface PermintaanDriverFormData {
  nomor?: string;
  tanggal: string;
  jamMinta?: string;
  tipeJadwal: string;
  customer: string;
  pengambilan: string;
  pic: string;
  uraian: string;
  jamKerja: string;
  status: string;
  hariKerja: "Hari Ini" | "Besok";
  items: PermintaanDriverDetailItem[];
}

export const permintaanDriverService = {
  getBrowse: (params: { tglAwal: string; tglAkhir: string }) =>
    api.get<{ success: boolean; data: PermintaanDriverRow[] }>(
      "/penjualan/permintaan-driver",
      { params },
    ),

  getDetail: (nomor: string) =>
    api.get<{ success: boolean; data: PermintaanDriverDetailRow[] }>(
      `/penjualan/permintaan-driver/${encodeURIComponent(nomor)}/detail`,
    ),

  getById: (nomor: string) =>
    api.get<{
      success: boolean;
      data: {
        nomor: string;
        tanggal: string;
        jamMinta: string;
        userPeminta: string;
        pengambilan: string;
        customer: string;
        pic: string;
        uraian: string;
        status: string;
        tipeJadwal: string;
        tglKerja: string;
        jamKerja: string;
        isClosed: number;
        isCancel: number;
        driver: string;
        items: PermintaanDriverDetailRow[];
      };
    }>(`/penjualan/permintaan-driver/${encodeURIComponent(nomor)}`),

  generateNomor: (tanggal: string) =>
    api.get<{ success: boolean; data: { nomor: string } }>(
      "/penjualan/permintaan-driver/generate-nomor",
      { params: { tanggal } },
    ),

  searchSpk: (q: string) =>
    api.get<{
      success: boolean;
      data: Array<{ Nomor: string; Nama: string; Tipe: string }>;
    }>("/penjualan/permintaan-driver/search-spk", { params: { q } }),

  create: (data: PermintaanDriverFormData) =>
    api.post("/penjualan/permintaan-driver", data),

  update: (nomor: string, data: PermintaanDriverFormData) =>
    api.put(`/penjualan/permintaan-driver/${encodeURIComponent(nomor)}`, data),

  deleteData: (nomor: string) =>
    api.delete(`/penjualan/permintaan-driver/${encodeURIComponent(nomor)}`),
};
