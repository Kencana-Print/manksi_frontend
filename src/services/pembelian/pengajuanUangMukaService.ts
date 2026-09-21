import api from "@/services/api";

export const pengajuanUangMukaService = {
  create(payload: {
    tanggal: string;
    keterangan?: string;
    items: {
      sumber: string;
      nomorHeader: string;
      itemNourut: number;
      nama?: string;
      satuan?: string;
      qty?: number;
      keterangan?: string;
      nominal: number;
      nominalAsli?: number;
    }[];
  }) {
    return api.post("/pembelian/pengajuan-uang-muka", payload);
  },
  getBrowse(
    params: {
      startDate?: string;
      endDate?: string;
      cabang?: string;
      status?: "OUTSTANDING" | "HISTORY";
    } = {},
  ) {
    return api.get("/pembelian/pengajuan-uang-muka", { params });
  },
  getDetail(nomor: string) {
    return api.get(
      `/pembelian/pengajuan-uang-muka/${encodeURIComponent(nomor)}`,
    );
  },
};
