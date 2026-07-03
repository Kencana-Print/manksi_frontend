import api from "@/services/api";

const BASE = "/garmen/stbj-form";
const LOOKUP = "/lookups";

export const stbjFormService = {
  // ── Form CRUD ─────────────────────────────────────────
  getById: (nomor: string) => api.get(BASE, { params: { nomor } }),

  save: (data: any) => api.post(BASE, data),

  update: (data: any) => api.put(BASE, data),

  // ── Load detail grid saat pilih SPK ───────────────────
  getSpkDetail: (spkNomor: string, gudangKode: string, excludeNomor = "") =>
    api.get(`${BASE}/spk-detail`, {
      params: { spkNomor, gudangKode, excludeNomor },
    }),

  getSpgDetail: (spgNomor: string, excludeNomor = "") =>
    api.get(`${BASE}/spg-detail`, { params: { spgNomor, excludeNomor } }),

  // ── Packing ───────────────────────────────────────────
  getPackingAll: () => api.get(`${BASE}/packing-all`),

  getPackingDetail: (packNomor: string, excludeNomor = "") =>
    api.get(`${BASE}/packing-detail`, { params: { packNomor, excludeNomor } }),

  // ── Cetak ─────────────────────────────────────────────
  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/cetak`, { params: { nomor } }),

  // ── Lookups (via lookupService) ───────────────────────
  getGudangJadi: (q = "", divisi = 0) =>
    api.get(`${LOOKUP}/gudang-jadi`, { params: { q, divisi } }),

  getGudangProduksiKoli: (q = "", cab = "", divisi = 0) =>
    api.get(`${LOOKUP}/gudang-produksi-koli`, { params: { q, cab, divisi } }),

  getSpkList: (q = "") =>
    api.get(`${LOOKUP}/spk`, { params: { q, filterMode: "all", limit: 50 } }),

  getSpgList: (q = "") =>
    api.get(`${LOOKUP}/spg`, { params: { q, limit: 50 } }),

  getPackingTersedia: (q = "", page = 1, limit = 50) =>
    api.get(`${LOOKUP}/packing-tersedia`, { params: { q, page, limit } }),
};
