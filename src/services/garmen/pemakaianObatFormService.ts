import api from "@/services/api";

export const pemakaianObatFormService = {
  getMeta: () => api.get("/garmen/pemakaian-obat/form/meta"),

  resolveSpk: (nomor: string) =>
    api.get(`/garmen/pemakaian-obat/form/spk/${encodeURIComponent(nomor)}`),

  resolveKomponen: (kode: string) =>
    api.get(`/garmen/pemakaian-obat/form/komponen/${encodeURIComponent(kode)}`),

  getFormData: (nomor: string) =>
    api.get(`/garmen/pemakaian-obat/form/${encodeURIComponent(nomor)}`),

  create: (payload: any) => api.post("/garmen/pemakaian-obat/form", payload),

  update: (nomor: string, payload: any) =>
    api.put(
      `/garmen/pemakaian-obat/form/${encodeURIComponent(nomor)}`,
      payload,
    ),
};
