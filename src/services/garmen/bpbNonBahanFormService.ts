import api from "@/services/api";

export const bpbNonBahanFormService = {
  getDetail: (nomor: string) =>
    api.get(
      `/garmen/barang/bpb-nonbahan/form/detail/${encodeURIComponent(nomor)}`,
    ),

  getPermintaanDetail: (mbNomor: string, bpbNomor: string = "") =>
    api.get(
      `/garmen/barang/bpb-nonbahan/form/permintaan/${encodeURIComponent(mbNomor)}`,
      {
        params: { bpbNomor },
      },
    ),

  getPoDetail: (poNomor: string, bpbNomor: string = "") =>
    api.get(
      `/garmen/barang/bpb-nonbahan/form/po/${encodeURIComponent(poNomor)}`,
      {
        params: { bpbNomor },
      },
    ),

  getSupplierByKode: (kode: string, jenis: string) =>
    api.get(
      `/garmen/barang/bpb-nonbahan/supplier/${encodeURIComponent(kode)}`,
      {
        params: { jenis },
      },
    ),

  getSpkByNomor: (nomor: string) =>
    api.get(`/garmen/barang/bpb-nonbahan/spk/${encodeURIComponent(nomor)}`),

  saveData: (payload: any) =>
    api.post("/garmen/barang/bpb-nonbahan/form/save", payload),
};
