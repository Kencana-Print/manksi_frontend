import api from "@/services/api";

export const inputPlanningSpkFormService = {
  getDetail: (nomor: string) =>
    api.get(
      `/garmen/planning-per-spk/input-planning-form/detail/${encodeURIComponent(nomor)}`,
    ),

  saveData: (payload: { nomor: string; rows: any[] }) =>
    api.post("/garmen/planning-per-spk/input-planning-form/save", payload),
};
