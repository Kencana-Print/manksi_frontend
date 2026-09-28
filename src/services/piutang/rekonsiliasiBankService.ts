import api from "@/services/api";

export const rekonsiliasiBankService = {
  getBrowse(tanggal: string) {
    return api.get("/piutang/rekonsiliasi-bank", { params: { tanggal } });
  },

  deleteData(rekKode: string, tanggal: string) {
    return api.delete(
      `/piutang/rekonsiliasi-bank/${encodeURIComponent(rekKode)}`,
      { params: { tanggal } },
    );
  },

  getValidasi(rekKode: string, tanggal: string) {
    return api.get(
      `/piutang/rekonsiliasi-bank/${encodeURIComponent(rekKode)}/validasi`,
      { params: { tanggal } },
    );
  },

  saveValidasi(rekKode: string, tanggal: string, saldoKoran: number) {
    return api.post(
      `/piutang/rekonsiliasi-bank/${encodeURIComponent(rekKode)}/validasi`,
      { tanggal, saldoKoran },
    );
  },

  getRekon(rekKode: string, tanggal: string) {
    return api.get(
      `/piutang/rekonsiliasi-bank/${encodeURIComponent(rekKode)}/rekon`,
      { params: { tanggal } },
    );
  },

  saveRekon(
    rekKode: string,
    tanggal: string,
    saldoBuku: number,
    saldoKoran: number,
    detail: {
      bukuTambah: any[];
      bukuKurang: any[];
      bankTambah: any[];
      bankKurang: any[];
    },
  ) {
    return api.post(
      `/piutang/rekonsiliasi-bank/${encodeURIComponent(rekKode)}/rekon`,
      { tanggal, saldoBuku, saldoKoran, detail },
    );
  },
};
