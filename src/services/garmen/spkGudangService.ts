import api from "@/services/api";

export const spkGudangService = {
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get("/garmen/spk-gudang", { params }),
  getDetail: (nomor: string) =>
    api.get("/garmen/spk-gudang/detail", { params: { nomor } }),
  deleteData: (nomor: string) =>
    api.delete("/garmen/spk-gudang", { params: { nomor } }),
  exportHeader: (params: { startDate: string; endDate: string }) =>
    api.get("/garmen/spk-gudang/export-header", { params }),
  exportDetail: (params: { startDate: string; endDate: string }) =>
    api.get("/garmen/spk-gudang/export-detail", { params }),
};
