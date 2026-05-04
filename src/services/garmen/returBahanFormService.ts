import api from "@/services/api";

export const returBahanFormService = {
  // Dropdown Gudang
  getGudangBahan() {
    return api.get("/garmen/bahan-baku/retur-bahan/form/gudang-bahan");
  },
  getGudangProduksi() {
    return api.get("/garmen/bahan-baku/retur-bahan/form/gudang-produksi");
  },

  // Pencarian Detail dari No Realisasi (F1kode Delphi)
  getDetailRealisasi(nominta: string, gdgproduksi: string) {
    return api.get("/garmen/bahan-baku/retur-bahan/form/realisasi-minta", {
      params: { nominta, gdgproduksi },
    });
  },

  // Data Edit
  getDetail(nomor: string) {
    return api.get(
      `/garmen/bahan-baku/retur-bahan/form/${encodeURIComponent(nomor)}`,
    );
  },

  // Simpan
  saveData(data: any, nomor?: string) {
    if (nomor) {
      return api.put(
        `/garmen/bahan-baku/retur-bahan/form/${encodeURIComponent(nomor)}`,
        data,
      );
    }
    return api.post("/garmen/bahan-baku/retur-bahan/form", data);
  },
};
