import api from "@/services/api";

export const invoiceProformaFormService = {
  getDetail: (nomor: string) =>
    api.get(`/penjualan/invoice-proforma/form/${encodeURIComponent(nomor)}`),

  getUangMuka: (nomor: string) =>
    api.get(
      `/penjualan/invoice-proforma/form/uang-muka/${encodeURIComponent(nomor)}`,
    ),

  saveData: (payload: any) => {
    if (payload.nomor) {
      return api.put("/penjualan/invoice-proforma/form", payload);
    }
    return api.post("/penjualan/invoice-proforma/form", payload);
  },

  // Lookup Divisi (Bisa pakai lookupService umum jika sudah ada)
  getDivisi: () => api.get("/lookups/divisi"),
};
