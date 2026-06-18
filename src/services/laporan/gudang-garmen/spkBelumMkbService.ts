import api from "@/services/api";

export const spkBelumMkbService = {
  getBrowse: (params: { startDate: string }) =>
    api.get("/laporan/gudang-garmen/spk-belum-mkb", { params }),
};
