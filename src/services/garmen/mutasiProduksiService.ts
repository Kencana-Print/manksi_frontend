import api from "@/services/api";

export const mutasiProduksiService = {
  getBrowse: (params: {
    tglAwal: string;
    tglAkhir: string;
    cab?: string;
    lini?: string;
  }) => api.get("/garmen/mutasi-produksi", { params }),

  getDetail: (nomor: string) =>
    api.get(`/garmen/mutasi-produksi/${encodeURIComponent(nomor)}/detail`),

  getDetailByFilter: (params: {
    tglAwal: string;
    tglAkhir: string;
    cab?: string;
    lini?: string;
  }) => api.get("/garmen/mutasi-produksi/detail-by-filter", { params }),

  getListGudangProduksi: (cab?: string) =>
    api.get("/garmen/mutasi-produksi/lookup/gudang-produksi", {
      params: cab ? { cab } : undefined,
    }),

  getListCabang: () => api.get("/garmen/mutasi-produksi/lookup/cabang"),

  deleteData: (nomor: string) =>
    api.delete(`/garmen/mutasi-produksi/${encodeURIComponent(nomor)}`),

  getPin5Status: (nomor: string, jenis = "MUTASI PRODUKSI") =>
    api.get(
      `/garmen/mutasi-produksi/${encodeURIComponent(nomor)}/pin5-status`,
      {
        params: { jenis },
      },
    ),

  cekPerluPengajuan: (nomor: string) =>
    api.get(
      `/garmen/mutasi-produksi/${encodeURIComponent(nomor)}/perlu-pengajuan`,
    ),

  pengajuanUbah: (nomor: string, payload: { alasan: string; urut: number }) =>
    api.post(
      `/garmen/mutasi-produksi/${encodeURIComponent(nomor)}/pengajuan-ubah`,
      payload,
    ),

  pengajuanHapus: (nomor: string, payload: { alasan: string; urut: number }) =>
    api.post(
      `/garmen/mutasi-produksi/${encodeURIComponent(nomor)}/pengajuan-hapus`,
      payload,
    ),
};
