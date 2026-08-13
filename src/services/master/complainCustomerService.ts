import api from "@/services/api";

export const complainCustomerService = {
  getBrowseList: (payload: { startDate: string; endDate: string }) =>
    api.get("/master/complain-customer", { params: payload }),

  deleteComplain: (nomor: string) =>
    api.delete(`/master/complain-customer/${encodeURIComponent(nomor)}`),
};
