import api from "@/services/api";

export const mutasiOutBarangFormService = {
  getDetail: (nomor: string) =>
    api.get(`/garmen/barang/mutasi-out/form/${encodeURIComponent(nomor)}`),

  searchBarang: (params: {
    jenis: string;
    bagian: string;
    cabang: string;
    search?: string;
  }) => api.get("/garmen/barang/mutasi-out/form/search-barang", { params }),

  // --- TAMBAHAN UNTUK FINANCE KASBON ---
  searchPermintaanFinance: (params: {
    jenis: string;
    cabangTujuan: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get("/garmen/barang/mutasi-out/form/search-permintaan-finance", {
      params,
    }),

  getDetailPermintaanFinance: (params: {
    noPermintaan: string;
    cabangAsal: string;
    nomorMso: string;
  }) =>
    api.get("/garmen/barang/mutasi-out/form/detail-permintaan-finance", {
      params,
    }),

  saveData: (payload: { isNewMode: boolean; data: any }) =>
    api.post("/garmen/barang/mutasi-out/form", payload), // Sesuai endpoint router Anda
};
