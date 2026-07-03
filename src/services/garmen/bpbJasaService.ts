import api from "@/services/api";

const BASE = "/garmen/bpb-jasa";
const BASE_FORM = "/garmen/bpb-jasa-form";

export const bpbJasaService = {
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

  // ── Tutup buku & cek hapus ─────────────────────────────────────────
  cekTutupBuku: (nomor: string) =>
    api.get(`${BASE}/cek-tutup-buku`, { params: { nomor } }),

  cekBisaHapus: (nomor: string) =>
    api.get(`${BASE}/cek-bisa-hapus`, { params: { nomor } }),

  // ── Update bayar produksi ──────────────────────────────────────────
  updateBayarProduksi: (nomor: string, status: string) =>
    api.post(`${BASE}/update-bayar-produksi`, { nomor, status }),

  // ── Cetak ──────────────────────────────────────────────────────────
  getDataCetak: (nomor: string) =>
    api.get(`${BASE}/cetak/${encodeURIComponent(nomor)}`),

  // ── Export ─────────────────────────────────────────────────────────
  getExportData: (tglAwal: string, tglAkhir: string, cab: string) =>
    api.get(`${BASE}/export`, { params: { tglAwal, tglAkhir, cab } }),

  getExportDetail: (tglAwal: string, tglAkhir: string, cab: string) =>
    api.get(`${BASE}/export-detail`, { params: { tglAwal, tglAkhir, cab } }),

  // ── Form ───────────────────────────────────────────────────────────
  getFormById: (nomor: string) =>
    api.get(`${BASE_FORM}/by-nomor`, { params: { nomor } }),

  getDataPO: (poNomor: string) =>
    api.get(`${BASE_FORM}/po`, { params: { nomor: poNomor } }),

  getKomponenList: (spkNomor: string) =>
    api.get(`${BASE_FORM}/komponen`, { params: { spkNomor } }),

  getBabaranStd: (spkNomor: string, komponen: string) =>
    api.get(`${BASE_FORM}/babaran-std`, { params: { spkNomor, komponen } }),

  getKelompokTujuan: (cab: string) =>
    api.get(`${BASE_FORM}/kelompok-tujuan`, { params: { cab } }),

  getDataRealisasiMinta: (noMaterial: string, bhnKode: string) =>
    api.get(`${BASE_FORM}/realisasi-minta`, {
      params: { noMaterial, bhnKode },
    }),

  saveForm: (data: any) => api.post(BASE_FORM, data),

  updateForm: (nomor: string, data: any) =>
    api.put(`${BASE_FORM}/by-nomor`, { ...data, Nomor: nomor }),
};
