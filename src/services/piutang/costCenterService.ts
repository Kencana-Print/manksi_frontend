import api from "@/services/api";

export const costCenterService = {
  search: (query: string) =>
    api.get("/piutang/cost-center/search", { params: { query } }),
};
