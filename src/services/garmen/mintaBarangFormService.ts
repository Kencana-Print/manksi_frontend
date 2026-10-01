import api from "@/services/api";

export const mintaBarangFormService = {
  getDetail(nomor: string, opts?: { print?: boolean }) {
    return api.get(
      `/garmen/barang/permintaan/form/${encodeURIComponent(nomor)}`,
      { params: opts?.print ? { print: 1 } : undefined },
    );
  },

  getGudangByKode: (kode: string, cabang: string) =>
    api.get(
      `/garmen/barang/permintaan/form/gudang/${encodeURIComponent(kode)}`,
      {
        params: { cabang },
      },
    ),

  getBarangByKode: (
    kode: string,
    jenis: string,
    cabang?: string,
    bagian?: string,
  ) =>
    api.get(
      `/garmen/barang/permintaan/form/barang/${encodeURIComponent(kode)}`,
      { params: { jenis, cabang, bagian } },
    ),

  saveData(payload: any) {
    return api.post("/garmen/barang/permintaan/form", payload);
  },
};
