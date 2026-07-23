import api from "@/services/api";

const BASE = "/laporan/produksi-garmen/stok-by-line";

export const stokProduksibyLineService = {
  getBrowse: (lini = "FINISHING", cab = "P04") =>
    api.get(BASE, { params: { lini, cab } }),
};
