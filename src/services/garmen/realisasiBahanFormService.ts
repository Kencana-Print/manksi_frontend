import api from "@/services/api";

export const realisasiBahanFormService = {
  getPermintaanInfo: (noMinta: string, currentNomor?: string) =>
    api.get(`/garmen/bahan-baku/realisasi-minta-form/permintaan-info`, {
      params: { noMinta, nomor: currentNomor },
    }),

  getBarcodeInfo: (barcode: string) =>
    api.get(
      `/garmen/bahan-baku/realisasi-minta-form/barcode-info/${encodeURIComponent(barcode)}`,
    ),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/realisasi-minta-form/${encodeURIComponent(nomor)}`,
    ),

  saveData: (payload: any, nomor?: string) => {
    if (nomor) {
      return api.put(
        `/garmen/bahan-baku/realisasi-minta-form/${encodeURIComponent(nomor)}`,
        payload,
      );
    }
    return api.post("/garmen/bahan-baku/realisasi-minta-form", payload);
  },
};
