import api from "@/services/api";

export const poNonBahanFormService = {
  getDetail: (nomor: string) =>
    // Tambahkan /barang sebelum /po-nonbahan-form
    api.get(
      `/garmen/barang/po-nonbahan-form/detail/${encodeURIComponent(nomor)}`,
    ),

  getPermintaanDetail: (mbNomor: string, poNomor: string = "") =>
    // Tambahkan /barang sebelum /po-nonbahan-form
    api.get(
      `/garmen/barang/po-nonbahan-form/permintaan/${encodeURIComponent(mbNomor)}`,
      {
        params: { poNomor },
      },
    ),

  getSupplierByKode: (kode: string) =>
    api.get(`/garmen/barang/po-nonbahan/supplier/${encodeURIComponent(kode)}`),

  saveData: (payload: any) =>
    // Tambahkan /barang sebelum /po-nonbahan-form
    api.post("/garmen/barang/po-nonbahan-form/save", payload),
};
