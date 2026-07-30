import api from "@/services/api";

const BASE = "/laporan/marketing/revisi-map";

export const revisiMemoSpkService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get(BASE, { params: { startDate, endDate } }),
};
