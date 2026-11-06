import api from "@/services/api";

export type JenisRekapMonitoring = "CETAK" | "JAHIT" | "LIPAT" | "QUIRING";

export const KOLOM_ANGKA = [
  "Pcs_JA",
  "Pcs_MD",
  "Pcs_KP",
  "Pcs_AI",
  "Pcs_SM",
  "Pcs_Total",
  "Meter_JA",
  "Meter_MD",
  "Meter_KP",
  "Meter_AI",
  "Meter_SM",
  "Meter_Total",
] as const;

export type KolomAngka = (typeof KOLOM_ANGKA)[number];

export type RekapMonitoringByGudangRow = {
  Kelompok: string | null;
} & Record<KolomAngka, number>;

export interface RekapMonitoringByGudangParams {
  tglAwal: string;
  tglAkhir: string;
  jenis: JenisRekapMonitoring;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/rekap-monitoring-by-gudang";

export const rekapMonitoringByGudangService = {
  getBrowse: (params: RekapMonitoringByGudangParams) =>
    api.get<ApiResult<RekapMonitoringByGudangRow[]>>(BASE, { params }),
};
