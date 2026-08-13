import api from "@/services/api";

export const complainCustomerFormService = {
  getDetail: (nomor: string) =>
    api.get(`/master/complain-customer-form/${encodeURIComponent(nomor)}`),

  getJenisComplainOptions: () =>
    api.get("/master/complain-customer-form/jenis-complain"),

  getSpkDetail: (nomor: string) =>
    api.get(
      `/master/complain-customer-form/spk-detail/${encodeURIComponent(nomor)}`,
    ),

  create: (payload: any) => api.post("/master/complain-customer-form", payload),

  update: (nomor: string, payload: any) =>
    api.put(
      `/master/complain-customer-form/${encodeURIComponent(nomor)}`,
      payload,
    ),

  uploadImage: (file: File, nomor: string, slot: number) => {
    const fd = new FormData();
    fd.append("gambar", file);
    fd.append("nomor", nomor);
    fd.append("slot", String(slot));
    return api.post("/master/complain-customer-form/upload-image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  resetImages: (nomor: string) =>
    api.post("/master/complain-customer-form/reset-images", { nomor }),
};
