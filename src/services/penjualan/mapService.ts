import api from "@/services/api";

export const mapService = {
  getBrowseList(params: any) {
    return api.get("/penjualan/map", { params });
  },
  deleteMap(nomor: string) {
    return api.delete(`/penjualan/map/${nomor}`);
  },
  toggleClose(nomor: string, isClose: string) {
    return api.put(`/penjualan/map/${nomor}/close`, { isClose });
  },
  approveCmo(nomor: string) {
    return api.put(`/penjualan/map/${nomor}/approve`);
  },
  requestPin5(nomor: string, alasan: string) {
    return api.post(`/penjualan/map/${nomor}/pin5`, { alasan });
  },

  getDesignList: (startDate: string, endDate: string) =>
    api.get("/penjualan/map/design/list", { params: { startDate, endDate } }),

  updateDesignStatus: (rows: { Nomor: string; DesignDone: string }[]) =>
    api.put("/penjualan/map/design/status", { rows }),
};
