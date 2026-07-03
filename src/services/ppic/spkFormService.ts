import api from "@/services/api";

export const spkFormService = {
  getDetail: (nomor: string) =>
    api.get("/ppic/spk/form/detail", { params: { nomor } }),

  // Ambil data SO sebagai dasar create SPK PPIC baru
  getSoSource: (soNomor: string) =>
    api.get("/ppic/spk/form/so-source", { params: { soNomor } }),

  save: (payload: any) =>
    payload.isEdit
      ? api.put("/ppic/spk/form/save", payload)
      : api.post("/ppic/spk/form/save", payload),

  getInitSizes: () => api.get("/ppic/spk/form/init-sizes"),

  getStandarUkuran: (joKode: string, varian = "STANDAR") =>
    api.get("/ppic/spk/form/standar-ukuran", { params: { joKode, varian } }),

  getMkbDetail: (spkNomor: string) =>
    api.get("/ppic/spk/form/mkb-detail", { params: { spkNomor } }),

  getKomponenMaster: (isBordir?: boolean) =>
    api.get("/ppic/spk/form/komponen-master", {
      params: isBordir ? { isBordir: "true" } : {},
    }),

  importLayoutProses: (spkNomor: string, file: File) => {
    const fd = new FormData();
    fd.append("spkNomor", spkNomor);
    fd.append("file", file);
    return api.post("/ppic/spk/form/layout-proses/import", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  getLayoutProses: (spkNomor: string) =>
    api.get("/ppic/spk/form/layout-proses", { params: { spkNomor } }),

  getKeteranganKhusus: (spkNomor: string) =>
    api.get("/ppic/spk/form/keterangan-khusus", { params: { spkNomor } }),
};
