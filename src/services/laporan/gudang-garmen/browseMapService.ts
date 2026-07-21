import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/browse-map";

export const browseMapService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get(BASE, { params: { startDate, endDate } }),
};
