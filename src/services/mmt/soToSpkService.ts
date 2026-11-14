import api from "@/services/api";

export const soToSpkService = {
  // 1. Mengambil data list / browse SO to SPK
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    workshop?: string;
    customer?: string;
    [key: string]: any;
  }) => api.get("/mmt/so-spk", { params }),

  // 2. Mengambil detail breakdown size SPK
  getSizes: (nomor: string) =>
    api.get(`/mmt/so-spk/${encodeURIComponent(nomor)}/sizes`),

  // 3. Menghapus data SPK
  deleteSpk: (nomor: string) =>
    api.delete(`/mmt/so-spk/${encodeURIComponent(nomor)}`),

  // 4. Toggle Close / Batal Close SPK
  // 4. Toggle Close / Batal Close SPK
  toggleClose: (
    nomor: string,
    payload: { isClose: boolean; alasan?: string },
  ) =>
    api.put(`/mmt/so-spk/${encodeURIComponent(nomor)}/toggle-close`, payload),

  // 5. Mengajukan PIN / Perubahan Data SPK
  requestPin: (nomor: string, alasan: string) =>
    api.post(`/mmt/so-spk/${encodeURIComponent(nomor)}/request-pin`, {
      alasan,
    }),

  // 6. Menyutujui / Approve SPK
  approveCmo: (nomor: string) =>
    api.put(`/mmt/so-spk/${encodeURIComponent(nomor)}/approve`),

  // 7. Pengecekan status & izin cetak SPK
  checkPrintPermission: (nomor: string) =>
    api.get(`/mmt/so-spk/${encodeURIComponent(nomor)}/print-check`),

  // 8. Pengajuan approval cetak ulang ke Manager
  requestPrintApproval: (nomor: string, alasan: string) =>
    api.post(
      `/mmt/so-spk/${encodeURIComponent(nomor)}/request-print-approval`,
      { alasan },
    ),

  // 9. Pencatatan log/history setelah SPK dicetak
  recordPrint: (nomor: string) =>
    api.post(`/mmt/so-spk/${encodeURIComponent(nomor)}/record-print`),

  // ==========================================
  // 🔧 METHOD BARU & KOREKSI UNTUK FORM & TAB
  // ==========================================

  // 🟢 FIX ERROR MAIN: createSave & updateSave (Dipanggil oleh FormSoToSpkView.vue)
  createSave: (payload: any) => api.post("/mmt/so-spk/save", payload),
  updateSave: (payload: any) => api.put("/mmt/so-spk/save", payload),

  // Method simpan fleksibel (fallback)
  save: (payload: any) =>
    payload.isEdit
      ? api.put("/mmt/so-spk/save", payload)
      : api.post("/mmt/so-spk/save", payload),

  // Ambil detail SPK (Bisa terima String 'SO-123' ATAU Object { nomor: 'SO-123' })
  getDetail: (params: string | { nomor: string; [key: string]: any }) => {
    const p = typeof params === "string" ? { nomor: params } : params;
    return api.get("/mmt/so-spk/detail", { params: p });
  },

  // Ambil data SO sebagai dasar create SPK (Bisa terima String ATAU Object { nomor })
  getSoSource: (
    params: string | { nomor?: string; soNomor?: string; [key: string]: any },
  ) => {
    const soNomor =
      typeof params === "string" ? params : params.soNomor || params.nomor;
    return api.get("/mmt/so-spk/so-source", { params: { soNomor } });
  },

  getInitSizes: () => api.get("/mmt/so-spk/init-sizes"),

  getStandarUkuran: (joKode: string, varian = "STANDAR") =>
    api.get("/mmt/so-spk/standar-ukuran", { params: { joKode, varian } }),

  // 🟢 FIX COMPATIBILITY: getMkbDetail & getMkbDetailBySpk dibuat kompatibel ganda
  getMkbDetail: (
    params: string | { spkNomor?: string; nomor?: string; [key: string]: any },
  ) => {
    const spkNomor =
      typeof params === "string" ? params : params.spkNomor || params.nomor;
    return api.get("/mmt/so-spk/mkb-detail", { params: { spkNomor } });
  },

  getMkbDetailBySpk: (
    params: string | { spkNomor?: string; nomor?: string; [key: string]: any },
  ) => {
    const spkNomor =
      typeof params === "string" ? params : params.spkNomor || params.nomor;
    return api.get("/mmt/so-spk/mkb-detail", { params: { spkNomor } });
  },

  getKomponenMaster: (isBordir?: boolean) =>
    api.get("/mmt/so-spk/komponen-master", {
      params: isBordir ? { isBordir: "true" } : {},
    }),

  importLayoutProses: (spkNomor: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("spkNomor", spkNomor);
    return api.post("/mmt/so-spk/layout-proses/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getLayoutProses: (spkNomor: string) =>
    api.get("/mmt/so-spk/layout-proses", { params: { spkNomor } }),

  getKeteranganKhusus: (spkNomor: string) =>
    api.get("/mmt/so-spk/keterangan-khusus", { params: { spkNomor } }),

  getAlokasi: (nomor: string) =>
    api.get("/mmt/so-spk/alokasi", { params: { nomor } }),
};
