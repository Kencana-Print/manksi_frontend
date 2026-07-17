import api from "@/services/api";

const BASE = "/laporan/gudang-garmen/stok-barang-jadi";

export const stokBarangJadiService = {
  getBrowse: (gudang = "") => api.get(BASE, { params: { gudang } }),

  getExportData: (gudang = "") =>
    api.get(`${BASE}/export`, { params: { gudang } }),
};
