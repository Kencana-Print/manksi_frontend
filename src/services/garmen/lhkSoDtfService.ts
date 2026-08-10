import api from "@/services/api";

export const lhkSoDtfService = {
  getBrowse: (startDate: string, endDate: string, cab?: string) =>
    api.get("/garmen/dtf/lhk-so-dtf/browse", {
      params: {
        startDate,
        endDate,
        cab: cab && cab !== "ALL" ? cab : undefined,
      },
    }),

  deleteData: (spkNomor: string, cab: string, tanggal: string) =>
    api.delete(
      `/garmen/dtf/lhk-so-dtf/${encodeURIComponent(spkNomor)}/${encodeURIComponent(
        cab,
      )}/${encodeURIComponent(tanggal)}`,
    ),
};
