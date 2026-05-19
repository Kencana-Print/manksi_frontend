import api from "@/services/api";

export const poBahanVsMkbService = {
  // Ambil Master PO
  getBrowse: (params: {
    startDate: string;
    endDate: string;
    supplier?: string;
  }) => api.get("/laporan/gudang-garmen/po-bahan-vs-mkb", { params }),

  // Ambil Detail Bahan beserta nested Riwayat MKB
  getDetail: (nomor: string) =>
    api.get(
      `/laporan/gudang-garmen/po-bahan-vs-mkb/detail/${encodeURIComponent(nomor)}`,
    ),
};
