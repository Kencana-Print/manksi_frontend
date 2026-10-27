import api from "@/services/api";

export interface PengajuanPerbaikanRow {
  Nomor: string;
  Tanggal: string;
  Cabang: string;
  Pemohon: string;
  Lokasi: string;
  Bagian: string;
  Jenis: string;
  Keterangan: string;
  TglKonfirmasiGA: string | null;
  NamaGA: string;
  Jadwal1: string | null;
  Jadwal2: string | null;
  Teknisi: string;
  DiKonfirmasiTeknisi: string;
  TglKonfirmasiTeknisi: string | null;
  Pengajuan: string;
  StatusPengerjaan: "Belum" | "Proses" | "Selesai";
  KetProses: string;
  TglSelesai: string | null;
  IsClose: string;
  TglClose: string | null;
}

export interface PengajuanPerbaikanDetailRow {
  Nomor: string;
  Id: number | string;
  Nama: string;
  Spesifikasi: string;
  Satuan: string;
  Qty: number;
  Verifikasi: number;
  Realisasi: number;
  Terpakai: number;
  Keterangan: string;
}

export interface PengajuanPerbaikanExportDetailRow {
  Nomor: string;
  Tanggal: string;
  Cabang: string;
  Pemohon: string;
  Lokasi: string;
  Bagian: string;
  JenisPekerjaan: string;
  NamaBarang: string;
  Spesifikasi: string;
  Satuan: string;
  Qty: number;
  Verifikasi: number;
  Realisasi: number;
  Terpakai: number;
  StatusItem: string;
  StatusPengerjaan: string;
  Teknisi: string;
}

export const laporanPengajuanPerbaikanService = {
  getBrowse: (params: {
    tglAwal: string;
    tglAkhir: string;
    cabang?: string;
    search?: string;
  }) =>
    api.get<{ success: boolean; data: PengajuanPerbaikanRow[] }>(
      "/ga/laporan-pengajuan-perbaikan",
      { params },
    ),

  getDetailByNomor: (nomor: string) =>
    api.get<{ success: boolean; data: PengajuanPerbaikanDetailRow[] }>(
      `/ga/laporan-pengajuan-perbaikan/${encodeURIComponent(nomor)}/detail`,
    ),

  getAllDetail: (params: {
    tglAwal: string;
    tglAkhir: string;
    cabang?: string;
    search?: string;
  }) =>
    api.get<{
      success: boolean;
      data: PengajuanPerbaikanExportDetailRow[];
    }>("/ga/laporan-pengajuan-perbaikan/detail-all", { params }),
};
