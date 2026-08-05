import api from "@/services/api";

const BASE = "/garmen/barang/approve-retur-barang";

export interface ApproveDetailItem {
  nominta: string;
  kode: string;
  nama: string;
  satuan: string;
  retur: number;
  jumlah: number;
  sudah: number;
  keterangan: string;
  spk: string;
}

export const approveReturBarangService = {
  getBrowse: (startDate: string, endDate: string, jenis: string) =>
    api.get(`${BASE}/browse`, { params: { startDate, endDate, jenis } }),

  getApprovalDetail: (logNomor: string, noApprov?: string) =>
    api.get(`${BASE}/${encodeURIComponent(logNomor)}`, {
      params: { noApprov: noApprov || undefined },
    }),

  saveApproval: (payload: {
    logNomor: string;
    noApprov: string;
    jenis: string;
    tanggalApprove: string;
    keterangan: string;
    gudangProduksi: { kode: string; nama: string };
    details: ApproveDetailItem[];
  }) => api.post(BASE, payload),

  cancelApproval: (noApprov: string) =>
    api.delete(`${BASE}/${encodeURIComponent(noApprov)}`),
};
