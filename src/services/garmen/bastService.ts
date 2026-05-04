import api from "@/services/api";

export const bastService = {
  /**
   * Mengambil data browse BAST dengan filter tanggal atau On Progress
   */
  getBrowseList(params: {
    startDate?: string;
    endDate?: string;
    onProgress?: boolean;
  }) {
    return api.get("/garmen/cetak-bast", { params });
  },

  /**
   * Menghapus data BAST (sekaligus mereset status SPK di backend)
   */
  deleteBast(nomor: string) {
    return api.delete(`/garmen/cetak-bast/${encodeURIComponent(nomor)}`);
  },

  /**
   * Mengambil data mentah untuk export detail (Header-Detail gabungan)
   */
  getExportDetail(params: any) {
    return api.get("/garmen/cetak-bast/export-detail", { params });
  },
};
