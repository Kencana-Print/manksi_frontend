import api from "@/services/api";

const BASE = "/garmen/barang/retur-pembelian/form";

export const returPembelianFormService = {
  getFormData: (nomor: string) =>
    api.get(`${BASE}/${encodeURIComponent(nomor)}`),

  create: (payload: any) => api.post(BASE, payload),

  update: (nomor: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),

  resolveBpb: (jenis: string, bpbNomor: string) =>
    api.get(`${BASE}/resolve-bpb`, { params: { jenis, bpbNomor } }),

  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/cetak/${encodeURIComponent(nomor)}`),
};
