import api from "@/services/api";
import { lhkMarkerFormService } from "@/services/ppic/lhkMarkerFormService";

const BASE = "/ppic/lhk-marker";

export const lhkMarkerService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get(BASE, { params }),

  getDetail: (nomor: string) => lhkMarkerFormService.getDetail(nomor),
};
