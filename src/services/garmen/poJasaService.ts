import api from "@/services/api";

const BASE = "/garmen/po-jasa";

export const poJasaFormService = {
  // ── Browse ─────────────────────────────────────────────────────────
  getBrowse: (tglAwal: string, tglAkhir: string, cab: string) =>
    api.get(BASE, { params: { tglAwal, tglAkhir, cab } }),

  getDetailByNomor: (nomor: string) =>
    api.get(`${BASE}/${encodeURIComponent(nomor)}/detail`),

  // ── Form ───────────────────────────────────────────────────────────
  getById: (nomor: string) =>
    api.get(`${BASE}/by-nomor`, { params: { nomor } }),

  save: (data: any) => api.post(BASE, data),

  update: (nomor: string, data: any) =>
    api.put(`${BASE}/by-nomor`, { ...data, Nomor: nomor }),

  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),

  // ── Pengajuan PIN5 ─────────────────────────────────────────────────
  pengajuanUbah: (payload: {
    nomor: string;
    tanggal: string;
    keterangan?: string;
    alasan: string;
  }) => api.post(`${BASE}/pengajuan-ubah`, payload),

  pengajuanHapus: (payload: {
    nomor: string;
    tanggal: string;
    keterangan?: string;
    alasan: string;
  }) => api.post(`${BASE}/pengajuan-hapus`, payload),

  // ── Lookup ─────────────────────────────────────────────────────────
  getJasaList: () => api.get(`${BASE}/lookup/jasa`),

  getGudangList: (cab: string) =>
    api.get(`${BASE}/lookup/gudang`, { params: { cab } }),

  // ── Cetak ──────────────────────────────────────────────────────────
  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/cetak/${encodeURIComponent(nomor)}`),

  getDataCetakSJ: (nomor: string) =>
    api.get(`${BASE}/cetak-sj/${encodeURIComponent(nomor)}`),

  // ── Export ─────────────────────────────────────────────────────────
  getExportData: (tglAwal: string, tglAkhir: string, cab: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir, cab } }),

  getExportDetail: (tglAwal: string, tglAkhir: string, cab: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir, cab } }),

  // ── SPK lookup (reuse from mutasi/generic lookup) ──────────────────
  searchSpk: (q: string) => api.get("/lookups/spk", { params: { q } }),

  searchSupplier: (q: string) =>
    api.get("/lookups/supplier", { params: { q } }),

  searchBahan: (q: string) => api.get("/lookups/bahan", { params: { q } }),
};
