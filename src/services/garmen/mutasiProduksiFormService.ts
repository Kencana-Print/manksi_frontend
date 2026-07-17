import api from "@/services/api";

export const mutasiProduksiFormService = {
  // Gudang asal/tujuan berdasarkan jenis mutasi
  getGudangByMutasi: (cab: string, jenis: string) =>
    api.get("/garmen/mutasi-produksi-form/gudang-mutasi", {
      params: { cab, jenis },
    }),

  // Info SPK
  getSpkInfo: (nomor: string) =>
    api.get("/garmen/mutasi-produksi-form/spk-info", { params: { nomor } }),

  // Komponen list per SPK
  getKomponenList: (nomorSpk: string) =>
    api.get("/garmen/mutasi-produksi-form/komponen", { params: { nomorSpk } }),

  // Babaran standar + MKB info
  getBabaranInfo: (nomorSpk: string, komponen: string) =>
    api.get("/garmen/mutasi-produksi-form/babaran", {
      params: { nomorSpk, komponen },
    }),

  // Search No Material
  searchNoMaterial: (nomorSpk: string, q = "", page = 1, limit = 30) =>
    api.get("/garmen/mutasi-produksi-form/search-material", {
      params: { nomorSpk, q, page, limit },
    }),

  // Detail No Material (setelah pilih)
  getNoMaterialDetail: (
    noMaterial: string,
    kodeBahan: string,
    excludeNomor = "",
  ) =>
    api.get("/garmen/mutasi-produksi-form/material-detail", {
      params: { noMaterial, kodeBahan, excludeNomor },
    }),

  searchBahanBySuffix: (suffix: string, gdgAsal: string) =>
    api.get("/garmen/mutasi-produksi-form/bahan-suffix", {
      params: { suffix, gdgAsal },
    }),

  // Planning PPIC
  getPlanningPpic: (
    nomorSpk: string,
    jenisMutasi: string,
    kelompok = "",
    tglDibuat = "",
  ) =>
    api.get("/garmen/mutasi-produksi-form/planning", {
      params: { nomorSpk, jenisMutasi, kelompok, tglDibuat },
    }),

  // Kelompok list per nama gudang asal
  getKelompokList: (namaGudang: string, cab: string) =>
    api.get("/garmen/mutasi-produksi-form/kelompok", {
      params: { namaGudang, cab },
    }),

  // Kelompok tujuan (hanya GP003)
  getKelompokTujuanList: (gdgTujuan: string, cab: string) =>
    api.get("/garmen/mutasi-produksi-form/kelompok-tujuan", {
      params: { gdgTujuan, cab },
    }),

  getDataCetak: (nomor: string) =>
    api.get(`/garmen/mutasi-produksi-form/cetak/${encodeURIComponent(nomor)}`),

  // Search bahan untuk grid
  searchBahan: (q = "", gdgAsal = "", page = 1, limit = 30) =>
    api.get("/garmen/mutasi-produksi-form/search-bahan", {
      params: { q, gdgAsal, page, limit },
    }),

  // Load kode bahan ke grid (auto-expand size)
  loadKodeBahan: (
    kode: string,
    nomorSpk: string,
    gdgAsal: string,
    excludeNomor = "",
    spkKodek = "",
  ) =>
    api.get("/garmen/mutasi-produksi-form/load-bahan", {
      params: { kode, nomorSpk, gdgAsal, excludeNomor, spkKodek },
    }),

  // Load komponen map (GP001/GP015 + MAP)
  loadKomponenMap: (
    nomorSpk: string,
    komponen: string,
    jumlahSpk: number,
    excludeNomor = "",
    gdgAsal = "",
  ) =>
    api.get("/garmen/mutasi-produksi-form/komponen-map", {
      params: { nomorSpk, komponen, jumlahSpk, excludeNomor, gdgAsal },
    }),

  // Komponen proof + terima + sudah DC (GP032)
  getKomponenProof: (nomorSpk: string) =>
    api.get("/garmen/mutasi-produksi-form/komponen-proof", {
      params: { nomorSpk },
    }),

  // Cek gudang asal (pending, planning, LHK)
  cekGudangAsal: (payload: {
    nomorSpk: string;
    gdgAsal: string;
    ckcetak: boolean;
    ckbordir: boolean;
    lbldivisi: string;
  }) => api.post("/garmen/mutasi-produksi-form/cek-gudang-asal", payload),

  // Search gudang produksi
  searchGudangProduksi: (q = "", cab = "") =>
    api.get("/garmen/mutasi-produksi-form/search-gudang", {
      params: { q, cab },
    }),

  // Nama gudang produksi
  getNamaGudang: (kode: string) =>
    api.get("/garmen/mutasi-produksi-form/nama-gudang", { params: { kode } }),

  // Proses sebelumnya (F4)
  getProsesSebelumnya: (nomorSpk: string, gdgAsal: string, excludeNomor = "") =>
    api.get("/garmen/mutasi-produksi-form/proses-sebelumnya", {
      params: { nomorSpk, gdgAsal, excludeNomor },
    }),

  cekKomponen: (nomorSpk: string, lini: string) =>
    api.get("/garmen/mutasi-produksi-form/cek-komponen", {
      params: { nomorSpk, lini },
    }),

  // Get by nomor (edit mode)
  getById: (nomor: string) =>
    api.get("/garmen/mutasi-produksi-form/by-nomor", { params: { nomor } }),

  // Save (insert)
  save: (payload: any) => api.post("/garmen/mutasi-produksi-form", payload),

  // Update (edit)
  update: (nomor: string, payload: any) =>
    api.put("/garmen/mutasi-produksi-form/by-nomor", {
      ...payload,
      Nomor: nomor,
    }),
};
