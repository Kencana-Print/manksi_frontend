import api from "@/services/api";

export const pelunasanFormService = {
  // 1. Ambil data saat mode Edit
  getFormEditData: (nomor: string) =>
    api.get(`/piutang/pelunasan-form/${encodeURIComponent(nomor)}`),

  // 2. Ambil info nota/invoice beserta saldonya
  getInfoInvoice: (nota: string) =>
    api.get("/piutang/pelunasan-form/info-invoice", { params: { nota } }),

  // 3. Ambil info pembayaran (Retur / Terima Bayar)
  getInfoPembayaran: (noPembayaran: string, cabang: string) =>
    api.get("/piutang/pelunasan-form/info-pembayaran", {
      params: { noPembayaran, cabang },
    }),

  // 4. Simpan Data (Otomatis handle POST untuk Baru, PUT untuk Edit)
  saveFormPelunasan: (payload: any) => {
    if (payload.isEdit) {
      return api.put("/piutang/pelunasan-form", payload);
    } else {
      return api.post("/piutang/pelunasan-form", payload);
    }
  },

  getPrintData: (nomor: string) =>
    api.get(`/piutang/pelunasan-form/${encodeURIComponent(nomor)}/print`),
};
