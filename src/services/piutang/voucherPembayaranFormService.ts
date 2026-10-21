import api from "@/services/api";

export interface RekapBarisVoucher {
  rekapNomor: string;
  noUrut: number;
  tanggalRekap: string;
  bulanTagihan: string;
  tipe: string;
  nota: string;
  nominal: number;
  tglRencana: string | null;
  fakturPajak: string;
  invoice: string;
  keterangan: string;
}

export interface RekapUnit {
  key: string;
  fakturPajak: string;
  invoice: string;
  total: number;
  baris: RekapBarisVoucher[];
}

export const voucherPembayaranFormService = {
  getSupplier(kode: string) {
    return api.get(
      `/piutang/voucher-pembayaran-form/supplier/${encodeURIComponent(kode)}`,
    );
  },
  searchSupplier(search: string) {
    return api.get("/piutang/voucher-pembayaran-form/supplier-options", {
      params: { search },
    });
  },
  getNotaDetail(kode: string, statusPpn: number, type: string, supKode = "") {
    return api.get("/piutang/voucher-pembayaran-form/nota-detail", {
      params: { kode, statusPpn, type, supKode },
    });
  },
  searchNota(type: string, supKode: string, search: string) {
    return api.get("/piutang/voucher-pembayaran-form/nota-search", {
      params: { type, supKode, search },
    });
  },
  getRekap(supKode: string) {
    return api.get<{ success: boolean; data: RekapUnit[] }>(
      "/piutang/voucher-pembayaran-form/rekap-tersedia",
      { params: { supKode } },
    );
  },
  getDetailForm(nomor: string) {
    return api.get(
      `/piutang/voucher-pembayaran-form/${encodeURIComponent(nomor)}`,
    );
  },
  cekStatusRealisasi(nomor: string) {
    return api.get(
      `/piutang/voucher-pembayaran-form/${encodeURIComponent(nomor)}/status-realisasi`,
    );
  },
  save(payload: any) {
    return api.post("/piutang/voucher-pembayaran-form", payload);
  },
  update(payload: any) {
    return api.put("/piutang/voucher-pembayaran-form", payload);
  },
  getPrintData(nomor: string) {
    return api.get(
      `/piutang/voucher-pembayaran/${encodeURIComponent(nomor)}/print`,
    );
  },
};
