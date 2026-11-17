import api from "@/services/api";

export interface PemakaianBahanMmtRow {
  tipeLhk?: string;
  tgl?: string;
  shift?: number;
  no_lhk_cetak?: string;
  lnomor?: string;
  noSpk?: string;
  namaOrder?: string;
  s12?: number;
  s34?: number;
  p?: number;
  l?: number;
  gsm?: string;
  orderPcs?: number;
  pRoll?: number;
  lebarBahan?: number;
  hasilQty?: number;
  hasilPRoll?: number;
  ambilP?: number;
  ambilL?: number;
  sisaBisaPakaiP?: number;
  sisaBisaPakaiL?: number;
  sisaRongsokP?: number;
  sisaRongsokL?: number;
  wasteMeter?: number;
  kodeMesin?: string;
  barcodeRoll?: string;
  isLO?: boolean;
  isGabunganChild?: boolean;
  showTgl?: boolean;
  showShift?: boolean;
  persenToleransi?: number;
  toleransiM2?: number;
  toleransiPersen?: number;
  orderLuas?: number;
  hasilLuas?: number;
  ambilLuas?: number;
  sisaBisaPakaiLuas?: number;
  sisaRongsokLuas?: number;
  aktualLuasPakai?: number;
  wasteM2?: number;
  wastePersen?: number;
  lostM2?: number;
  lostPersen?: number;
  totalWasteM2?: number;
  totalWastePersen?: number;
  inkC_MT02?: string | number;
  inkM_MT02?: string | number;
  inkY_MT02?: string | number;
  inkK_MT02?: string | number;
  inkC_MT03?: string | number;
  inkM_MT03?: string | number;
  inkY_MT03?: string | number;
  inkK_MT03?: string | number;
  inkC_MT04?: string | number;
  inkM_MT04?: string | number;
  inkY_MT04?: string | number;
  inkK_MT04?: string | number;
  inkC_MT05?: string | number;
  inkM_MT05?: string | number;
  inkY_MT05?: string | number;
  inkK_MT05?: string | number;
}

export const pemakaianBahanMmtService = {
  getReport(params: { startDate: string; endDate: string; mesin?: string; tipeLhk?: string }) {
    return api.get<PemakaianBahanMmtRow[]>("/mmt/lap-pemakaian-bahan", { params });
  },
};
