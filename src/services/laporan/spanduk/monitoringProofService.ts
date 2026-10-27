import api from "@/services/api";

export interface MonitoringProofRow {
  Nomor: string;
  Tanggal: string | null;
  Deadline: string | null;
  Nama: string;
  Jo_Kode: string | null;
  Jenis_Order: string | null;
  Panjang: number;
  Lebar: number;
  Rencana_Order: number;
  Jml_Proof: number;
  Lama_Proof: number;
  Tgl_Proof: string | null;
  Gudang: string | null;
  Status: string | null;
  Tg_Status: string | null;
  No_Arsip: string | null;
  Kain: string | null;
}

export const monitoringProofService = {
  getBrowse: (params: { tglAwal: string; tglAkhir: string }) =>
    api.get<{ success: boolean; data: MonitoringProofRow[] }>(
      "/laporan/spanduk/monitoring-proof",
      { params },
    ),
};
