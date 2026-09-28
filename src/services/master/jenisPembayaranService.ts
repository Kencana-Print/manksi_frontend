import api from "@/services/api";

export const jenisPembayaranService = {
  getAll: () => api.get("/master/jenis-pembayaran"),
  save: (payload: { nama: string }) =>
    api.post("/master/jenis-pembayaran", payload),
  delete: (nama: string) =>
    api.delete(`/master/jenis-pembayaran/${encodeURIComponent(nama)}`),
};
