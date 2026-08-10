import api from "@/services/api";

export const lhkSoDtfFormService = {
  getDetail: (cab: string, tanggal: string) =>
    api.get("/garmen/dtf/lhk-so-dtf-form/detail", { params: { cab, tanggal } }),
  getDefaultCab: (filterCab?: string) =>
    api.get("/garmen/dtf/lhk-so-dtf-form/default-cab", {
      params: { filterCab },
    }),
  lookupSpkMap: (keyword: string) =>
    api.get("/garmen/dtf/lhk-so-dtf-form/lookup-spk-map", {
      params: { keyword },
    }),
  lookupSoDtf: (keyword: string) =>
    api.get("/garmen/dtf/lhk-so-dtf-form/lookup-so-dtf", {
      params: { keyword },
    }),
  validateKode: (kode: string) =>
    api.get(
      `/garmen/dtf/lhk-so-dtf-form/validate-kode/${encodeURIComponent(kode)}`,
    ),
  save: (payload: { cab: string; tanggal: string; rows: any[] }) =>
    api.post("/garmen/dtf/lhk-so-dtf-form/save", payload),
};
