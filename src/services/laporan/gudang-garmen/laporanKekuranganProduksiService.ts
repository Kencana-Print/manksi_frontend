import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/kekurangan-produksi";

export interface KekuranganProduksiParams {
  startDate: string;
  endDate: string;
  komponen?: string;
  spk?: string;
  nama?: string;
  status?: string;
  map?: boolean;
}

export const laporanKekuranganProduksiService = {
  getBrowse: (params: KekuranganProduksiParams) => api.get(BASE, { params }),
};
