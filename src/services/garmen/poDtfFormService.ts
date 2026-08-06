import api from "@/services/api";

export const poDtfFormService = {
  getMeta: () => api.get("/garmen/po-dtf/form/meta"),

  resolveSupplier: (kode: string) =>
    api.get(`/garmen/po-dtf/form/supplier/${encodeURIComponent(kode)}`),

  resolveSpk: (nomor: string) =>
    api.get(`/garmen/po-dtf/form/spk/${encodeURIComponent(nomor)}`),

  getFormData: (nomor: string) =>
    api.get(`/garmen/po-dtf/form/${encodeURIComponent(nomor)}`),

  create: (formData: FormData) =>
    api.post("/garmen/po-dtf/form", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (nomor: string, formData: FormData) =>
    api.put(`/garmen/po-dtf/form/${encodeURIComponent(nomor)}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
