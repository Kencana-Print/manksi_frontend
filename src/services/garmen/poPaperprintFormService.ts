import api from "@/services/api";

export const poPaperprintFormService = {
  getMeta: () => api.get("/garmen/po-paperprint/form/meta"),

  resolveSupplier: (kode: string) =>
    api.get(`/garmen/po-paperprint/form/supplier/${encodeURIComponent(kode)}`),

  resolveSpk: (nomor: string) =>
    api.get(`/garmen/po-paperprint/form/spk/${encodeURIComponent(nomor)}`),

  getFormData: (nomor: string) =>
    api.get(`/garmen/po-paperprint/form/${encodeURIComponent(nomor)}`),

  create: (formData: FormData) =>
    api.post("/garmen/po-paperprint/form", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  update: (nomor: string, formData: FormData) =>
    api.put(
      `/garmen/po-paperprint/form/${encodeURIComponent(nomor)}`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    ),
};
