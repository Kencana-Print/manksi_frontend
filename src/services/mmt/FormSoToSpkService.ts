import api from "@/services/api";

export const FormSoToSpkService = {
  getDetail: (nomor: string) =>
    api.get("/mmt/spk/form/detail", { params: { nomor } }),

  // Ambil data SO sebagai dasar create SPK mmt baru
  getSoSource: (soNomor: string) =>
    api.get("/mmt/spk/form/so-source", { params: { soNomor } }),

  save: (payload: any) =>
    payload.isEdit
      ? api.put("/mmt/spk/form/save", payload)
      : api.post("/mmt/spk/form/save", payload),

  getInitSizes: () => api.get("/mmt/spk/form/init-sizes"),

  getStandarUkuran: (joKode: string, varian = "STANDAR") =>
    api.get("/mmt/spk/form/standar-ukuran", { params: { joKode, varian } }),

  getMkbDetail: (spkNomor: string) =>
    api.get("/mmt/spk/form/mkb-detail", { params: { spkNomor } }),

  getKomponenMaster: (isBordir?: boolean) =>
    api.get("/mmt/spk/form/komponen-master", {
      params: isBordir ? { isBordir: "true" } : {},
    }),

  importLayoutProses: (spkNomor: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file); // ← field name harus "file", sesuai upload.excel.single("file")
    formData.append("spkNomor", spkNomor); // ← field name harus persis "spkNomor", sesuai controller
    return api.post("/mmt/spk/form/layout-proses/import", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getLayoutProses: (spkNomor: string) =>
    api.get("/mmt/spk/form/layout-proses", { params: { spkNomor } }),

  getKeteranganKhusus: (spkNomor: string) =>
    api.get("/mmt/spk/form/keterangan-khusus", { params: { spkNomor } }),

  getAlokasi: (nomor: string) =>
    api.get("/mmt/spk/form/alokasi", { params: { nomor } }),
};
