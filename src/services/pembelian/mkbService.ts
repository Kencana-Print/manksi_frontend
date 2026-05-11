import api from "@/services/api";

export const mkbService = {
  getBrowse: (startDate: string, endDate: string) =>
    api.get(`/pembelian/mkb`, { params: { startDate, endDate } }),

  getLinkedPo: (nomor: string) =>
    api.get(`/pembelian/mkb/${encodeURIComponent(nomor)}/po`),

  getDetailData: (nomor: string) =>
    api.get(`/pembelian/mkb/${encodeURIComponent(nomor)}/detail`),

  deleteData: (nomor: string, tglTransaksi: string) =>
    api.delete(`/pembelian/mkb/${encodeURIComponent(nomor)}`, {
      data: { tglTransaksi },
    }),

  requestPin: (payload: {
    nomor: string;
    tanggal: string;
    spk: string;
    alasan: string;
  }) =>
    api.post(
      `/pembelian/mkb/${encodeURIComponent(payload.nomor)}/pin`,
      payload,
    ),
};
