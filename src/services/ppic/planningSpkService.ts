// services/ppic/planningSpkService.ts
import api from "@/services/api";

export interface PlanningSpkBrowseItem {
  Nomor: string;
  TglAwal: string;
  TglAkhir: string;
  Cabang: string;
  Close: string;
  NomorSPK: string;
  NamaOrder: string;
  JumlahOrder: number;
  Keterangan: string;
}

export interface PlanningSpkDetail {
  Nomor: string;
  NomorSPK: string;
  TglEstimasi: string;
  KedatanganBahan: number;
  Cutting: number;
  Cetak: number;
  Sublim: number;
  Bordir: number;
  LineA: number;
  LineB: number;
  LineC: number;
  LineD: number;
  LineE: number;
  LineF: number;
  LineG: number;
  LineH: number;
  LineI: number;
  LineJ: number;
  LineK: number;
  Sewing: number;
  Dtf: number;
  Finishing: number;
  Kirim: number;
  KetCutting: string;
  KetCetak: string;
  KetSublim: string;
  KetBordir: string;
  KetJahit: string;
  KetFinishing: string;
  KetKirim: string;
}

export interface PlanningSpkKeteranganPayload {
  divisi: "CUTTING" | "SEWING";
  spk: string;
  tanggal: string;
  line: string;
  keterangan: string;
}

export const planningSpkService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/ppic/planning-spk", { params }),

  getDetail: (nomor: string) =>
    api.get(`/ppic/planning-spk/${encodeURIComponent(nomor)}/detail`),

  getDetailAktual: (params: { startDate: string; endDate: string }) =>
    api.get("/ppic/planning-spk/detail-aktual", { params }),

  toggleClose: (nomor: string, isClose: boolean) =>
    api.patch(`/ppic/planning-spk/${encodeURIComponent(nomor)}/toggle-close`, {
      isClose,
    }),

  updateKeterangan: (nomor: string, payload: PlanningSpkKeteranganPayload) =>
    api.patch(
      `/ppic/planning-spk/${encodeURIComponent(nomor)}/keterangan`,
      payload,
    ),

  deleteData: (nomor: string) =>
    api.delete(`/ppic/planning-spk/${encodeURIComponent(nomor)}`),

  exportMaster: (params: { startDate: string; endDate: string }) =>
    api.get("/ppic/planning-spk/export-master", {
      params,
      responseType: "blob",
    }),

  exportDetail: (params: { startDate: string; endDate: string }) =>
    api.get("/ppic/planning-spk/export-detail", { params }),
};
