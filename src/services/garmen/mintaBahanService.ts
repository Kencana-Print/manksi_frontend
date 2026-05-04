import api from "@/services/api";

export const mintaBahanService = {
  getBrowse: (startDate: string, endDate: string, cabang: string) =>
    api.get("/garmen/bahan-baku/minta-bahan", {
      params: { startDate, endDate, cabang },
    }),

  getDetail: (nomor: string) =>
    api.get(`/garmen/bahan-baku/minta-bahan/${encodeURIComponent(nomor)}`),

  checkInsert: () => api.get("/garmen/bahan-baku/minta-bahan/check-insert"),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/bahan-baku/minta-bahan/${encodeURIComponent(nomor)}`),

  setClose: (nomor: string, payload: { alasan: string }) =>
    api.put(
      `/garmen/bahan-baku/minta-bahan/${encodeURIComponent(nomor)}/close`,
      payload,
    ),

  approveGudang: (
    nomor: string,
    payload: { status: string; alasan?: string },
  ) =>
    api.put(
      `/garmen/bahan-baku/minta-bahan/${encodeURIComponent(nomor)}/approve-gudang`,
      payload,
    ),

  approveManager: (
    nomor: string,
    payload: { status: string; alasan?: string },
  ) =>
    api.put(
      `/garmen/bahan-baku/minta-bahan/${encodeURIComponent(nomor)}/approve-manager`,
      payload,
    ),

  ajukanPerubahan: (nomor: string, payload: any) =>
    api.post(
      `/garmen/bahan-baku/minta-bahan/${encodeURIComponent(nomor)}/ajukan-perubahan`,
      payload,
    ),

  approveRealisasi: (nomorRealisasi: string) =>
    api.put(
      `/garmen/bahan-baku/minta-bahan/realisasi/${encodeURIComponent(nomorRealisasi)}/approve`,
    ),
};
