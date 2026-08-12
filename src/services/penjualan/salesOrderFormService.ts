import api from "@/services/api";

export const salesOrderFormService = {
  getDetail: (nomor: string) =>
    api.get(`/penjualan/sales-order/form/detail`, { params: { nomor } }),

  getKomponenMaster: () => api.get("/penjualan/sales-order/form/komponen-init"),

  getRepeatDetail: (nomor: string) =>
    api.get("/penjualan/sales-order/form/repeat-detail", { params: { nomor } }),

  saveData: (payload: any) =>
    api.post(`/penjualan/sales-order/form/save`, payload),
};
