import api from "@/services/api";

export const sjMapService = {
  getBrowseData(startDate: string, endDate: string) {
    return api.get("/penjualan/sj-map/browse", {
      params: { start_date: startDate, end_date: endDate },
    });
  },
  deleteData(nomor: string) {
    return api.delete(`/penjualan/sj-map/${encodeURIComponent(nomor)}`);
  },
  getPin5Status(nomor: string) {
    return api.get(`/penjualan/sj-map/pin5/${encodeURIComponent(nomor)}`);
  },
  ajukanPerubahan(payload: {
    nomor: string;
    tanggal: string;
    customer: string;
    alasan: string;
    urut: number;
  }) {
    return api.post("/penjualan/sj-map/pin5/ajukan", payload);
  },
};
