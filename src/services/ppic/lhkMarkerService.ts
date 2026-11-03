import api from "@/services/api";
import type { ApiResult } from "@/services/piutang/rekapPembayaranService";
import {
  lhkMarkerFormService,
  type AntreanMarkerData,
} from "@/services/ppic/lhkMarkerFormService";

const BASE = "/ppic/lhk-marker";

export const lhkMarkerService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get(BASE, { params }),

  getDetail: (nomor: string) => lhkMarkerFormService.getDetail(nomor),

  getAntrean: () => api.get<ApiResult<AntreanMarkerData>>(`${BASE}/antrean`),
};
