import api from "@/services/api";

export const praOrderService = {
  getDivisi() {
    return api.get("/penjualan/pra-order/divisi");
  },
  getBrowseList(params: any) {
    return api.get("/penjualan/pra-order/browse", { params });
  },
  deleteData(nomor: string) {
    return api.delete(`/penjualan/pra-order/${nomor}`);
  },
  getPengajuanStatus(nomor: string) {
    return api.get(`/penjualan/pra-order/pengajuan/${nomor}`);
  },
  submitPengajuan(nomor: string, urut: number, alasan: string) {
    return api.post(`/penjualan/pra-order/pengajuan/${nomor}`, {
      urut,
      alasan,
    });
  },

  // ── Form (praOrderFormService di backend) ──
  getInitGrids() {
    return api.get("/penjualan/pra-order-form/init-grids");
  },
  getById(nomor: string) {
    return api.get(`/penjualan/pra-order-form/${nomor}`);
  },
  save(data: any, isEdit: boolean) {
    return isEdit
      ? api.put(`/penjualan/pra-order-form/${data.nomor}`, data)
      : api.post(`/penjualan/pra-order-form/`, data);
  },
  uploadGambar(nomor: string, formData: FormData) {
    return api.post(`/penjualan/pra-order-form/${nomor}/gambar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  setStatusBahan(probId: number, status: string) {
    return api.patch(`/penjualan/pra-order-form/bahan/${probId}/status`, {
      status,
    });
  },
  setStatusPpic(nomor: string, status: string, catatan: string) {
    return api.patch(`/penjualan/pra-order-form/${nomor}/status-ppic`, {
      status,
      catatan,
    });
  },
  convertToMintaHarga(nomor: string) {
    return api.post(`/penjualan/pra-order-form/${nomor}/convert-mh`);
  },
  // tambahan di praOrderService.ts
  getKatalogCustomer(custKode: string, params: any) {
    return api.get(`/penjualan/pra-order-form/katalog/customer/${custKode}`, {
      params,
    });
  },
};
