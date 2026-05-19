import api from "@/services/api";

export const poBahanVsBpbService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/laporan/gudang-garmen/po-bahan-vs-bpb", { params }),

  getDetail: (nomor: string) =>
    api.get(
      `/laporan/gudang-garmen/po-bahan-vs-bpb/detail/${encodeURIComponent(nomor)}`,
    ),
};
