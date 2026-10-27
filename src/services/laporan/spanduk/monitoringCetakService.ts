import api from "@/services/api";

export interface MonitoringCetakRow {
  Hari: string | null;
  Tanggal: string | null;
  Perusahaan: string | null;
  Tgl_SPK: string | null;
  Deadline: string | null;
  Jenis_Order: string | null;
  Nama: string | null;
  Nomor: string;
  Panjang: number;
  Lebar: number;
  Jml_Order: number;
  J_Meter: number;
  Kain: string | null;
  Kurang: number;
  Jml_Luar: number;
  Jml_P02: number;
  Jml_Cetak: number;
  Meter_P02: number;
  Meter_Cetak: number;
}

export const monitoringCetakService = {
  getBrowse: (params: {
    tglAwal: string;
    tglAkhir: string;
    perusahaan?: string;
  }) =>
    api.get<{ success: boolean; data: MonitoringCetakRow[] }>(
      "/laporan/spanduk/monitoring-cetak",
      { params },
    ),
};
