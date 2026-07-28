import api from "@/services/api";

export const inputPlanningSpkService = {
  getBrowse: (params: any) =>
    api.get("/garmen/planning-per-spk/input-planning", { params }),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/planning-per-spk/input-planning/detail/${encodeURIComponent(nomor)}`,
    ),
};
