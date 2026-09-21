import api from "@/services/api";

export const uangMukaRealisasiService = {
  getAccountOptions(jenis: string, cabang: string) {
    return api.get("/pembelian/uang-muka-realisasi/account-options", {
      params: { jenis, cabang },
    });
  },
  getSupplierOptions(search = "") {
    return api.get("/pembelian/uang-muka-realisasi/supplier-options", {
      params: { search },
    });
  },
  getDetail(nomor: string) {
    return api.get(
      `/pembelian/uang-muka-realisasi/${encodeURIComponent(nomor)}`,
    );
  },
  saveRealisasi(nomor: string, payload: any) {
    return api.post(
      `/pembelian/uang-muka-realisasi/${encodeURIComponent(nomor)}/realisasi`,
      payload,
    );
  },
};
