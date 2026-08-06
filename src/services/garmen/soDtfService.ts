import api from "@/services/api";

export const soDtfService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get("/garmen/dtf/so-dtf/browse", {
      params: { startDate, endDate },
    }),
};
