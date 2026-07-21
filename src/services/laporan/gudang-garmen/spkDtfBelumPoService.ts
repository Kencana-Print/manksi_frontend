import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/spk-dtf-belum-po";

export const spkDtfBelumPoService = {
  getBrowse: (startDate: string, endDate: string, cab = "P04", supplier = "") =>
    api.get(BASE, { params: { startDate, endDate, cab, supplier } }),
};
