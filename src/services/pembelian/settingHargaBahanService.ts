import api from "@/services/api";

export const settingHargaBahanService = {
  // --- GARMEN KAIN ---
  getKainGarmen: () => api.get("/pembelian/setting-harga-bahan/garmen"),
  createKainGarmen: (payload: any) =>
    api.post("/pembelian/setting-harga-bahan/garmen", payload),
  updateKainGarmen: (id: string, payload: any) =>
    api.put(`/pembelian/setting-harga-bahan/garmen/${encodeURIComponent(id)}`, payload),
  deleteKainGarmen: (payload: any) =>
    api.delete("/pembelian/setting-harga-bahan/garmen", { data: payload }),

  // --- GARMEN TAMBAHAN / CUSTOM ---
  getTambahanGarmen: () =>
    api.get("/pembelian/setting-harga-bahan/garmen-tambahan"),
  createTambahanGarmen: (payload: any) =>
    api.post("/pembelian/setting-harga-bahan/garmen-tambahan", payload),
  updateTambahanGarmen: (ket: string, payload: any) =>
    api.put(
      `/pembelian/setting-harga-bahan/garmen-tambahan/${encodeURIComponent(ket)}`,
      payload
    ),
  deleteTambahanGarmen: (ket: string) =>
    api.delete(
      `/pembelian/setting-harga-bahan/garmen-tambahan/${encodeURIComponent(ket)}`
    ),

  // --- SPANDUK ---
  getSpanduk: () => api.get("/pembelian/setting-harga-bahan/spanduk"),
  createSpanduk: (payload: any) =>
    api.post("/pembelian/setting-harga-bahan/spanduk", payload),
  updateSpanduk: (id: number | string, payload: any) =>
    api.put(`/pembelian/setting-harga-bahan/spanduk/${id}`, payload),
  deleteSpanduk: (id: number | string) =>
    api.delete(`/pembelian/setting-harga-bahan/spanduk/${id}`),

  // --- MMT BAHAN ---
  getMmt: () => api.get("/pembelian/setting-harga-bahan/mmt"),
  createMmt: (payload: any) =>
    api.post("/pembelian/setting-harga-bahan/mmt", payload),
  updateMmt: (id: number | string, payload: any) =>
    api.put(`/pembelian/setting-harga-bahan/mmt/${id}`, payload),
  deleteMmt: (id: number | string) =>
    api.delete(`/pembelian/setting-harga-bahan/mmt/${id}`),

  // --- MMT TAMBAHAN / TOPPING ---
  getMmtTambahan: () =>
    api.get("/pembelian/setting-harga-bahan/mmt-tambahan"),
  createMmtTambahan: (payload: any) =>
    api.post("/pembelian/setting-harga-bahan/mmt-tambahan", payload),
  updateMmtTambahan: (id: number | string, payload: any) =>
    api.put(`/pembelian/setting-harga-bahan/mmt-tambahan/${id}`, payload),
  deleteMmtTambahan: (id: number | string) =>
    api.delete(`/pembelian/setting-harga-bahan/mmt-tambahan/${id}`),
};
