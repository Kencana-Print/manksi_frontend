import api from "@/services/api";

export const invoiceProformaFormService = {
  getPerusahaanByKode: (kode: string) =>
    api.get(
      `/penjualan/invoice-proforma/perusahaan/${encodeURIComponent(kode)}`,
    ),

  getCustomerByKode: (kode: string) =>
    api.get(`/penjualan/invoice-proforma/customer/${encodeURIComponent(kode)}`),

  getRekeningByNomor: (rekening: string, perushKode: string) =>
    api.get(
      `/penjualan/invoice-proforma/rekening/${encodeURIComponent(rekening)}`,
      {
        params: { perushKode },
      },
    ),

  getBarangByKode: (kode: string, perushKode: string, cusKode: string) =>
    api.get(`/penjualan/invoice-proforma/barang/${encodeURIComponent(kode)}`, {
      params: { perushKode, cusKode },
    }),

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
