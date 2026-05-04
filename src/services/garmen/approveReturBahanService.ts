import api from "@/services/api";

export const approveReturBahanService = {
  getBrowse(params: { startDate: string; endDate: string }) {
    return api.get("/garmen/bahan-baku/approve-retur", { params });
  },

  batalApprove(noApprov: string) {
    return api.delete(
      `/garmen/bahan-baku/approve-retur/batal/${encodeURIComponent(noApprov)}`,
    );
  },
};
