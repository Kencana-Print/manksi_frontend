import api from "@/services/api";

export interface ResumeProofBaris {
  Hari: number;
  Label: string;
  Per_Unit: Record<string, number>;
  Total: number;
}

export interface ResumeProofRekap {
  Label: string;
  Jumlah: number;
  Persen: number;
}

export interface ResumeProofData {
  Units: string[];
  Rows: ResumeProofBaris[];
  Total_Per_Unit: Record<string, number>;
  Total: number;
  Rekap: ResumeProofRekap[];
  Tanpa_Tgl_Proof: number;
}

export const resumeProofService = {
  getResume: (params: { tglAwal: string; tglAkhir: string }) =>
    api.get<{ success: boolean; data: ResumeProofData }>(
      "/laporan/spanduk/resume-proof",
      { params },
    ),
};
