import api from "@/services/api";

const BASE = "/laporan/marketing/proyeksi-bulanan";

export interface ProyeksiColumn {
  key: string;
  title: string;
  numeric?: boolean;
  sum?: boolean;
}

export const proyeksiBulananService = {
  getBrowse: (
    startDate: string,
    endDate: string,
    laporan: string | number = 1,
  ) => api.get(BASE, { params: { startDate, endDate, laporan } }),
};
