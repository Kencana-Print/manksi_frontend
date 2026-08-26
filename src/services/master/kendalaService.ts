import api from "@/services/api";

export const kendalaService = {
  getBrowseList: (payload: { startDate: string; endDate: string }) =>
    api.get("/master/kendala", { params: payload }),

  deleteKendala: (nomor: string) =>
    api.delete(`/master/kendala/${encodeURIComponent(nomor)}`),

  // Export di-generate di BACKEND (embed gambar via ExcelJS server-side),
  // bukan client-side seperti exportExcelSingle — jadi harus fetch
  // sebagai blob, bukan JSON biasa.
  exportExcel: (payload: { startDate: string; endDate: string }) =>
    api.get("/master/kendala/export", {
      params: payload,
      responseType: "blob",
    }),
};
