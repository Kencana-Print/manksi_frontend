import api from "@/services/api";

const BASE = "/piutang/rekap-pembayaran";

export interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface RekapBrowseItem {
  nomor: string;
  tanggal: string;
  jumlahSupplier: number;
  jumlahTransaksi: number;
  totalNominal: number;
  status: string;
  keterangan: string;
  alasanBatal: string;
  userCreate: string;
}

export interface RekapDetailRow {
  nomor: string;
  tanggal: string;
  status: string;
  noUrut: number;
  kodeSupplier: string;
  namaSupplier: string;
  bulanTagihan: string;
  tipe: string;
  kategori: string;
  kategoriUrut: number;
  nota: string;
  tglNota: string | null;
  nilaiNota: number;
  nominal: number;
  tglRencana: string | null;
  fakturPajak: string;
  invoice: string;
  keterangan: string;
  vouNomor: string;
  pjtNomor: string;
}

export interface RekapRange {
  startDate: string;
  endDate: string;
}

export const pesanError = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || fallback;
};

export const rekapPembayaranService = {
  getBrowse: (params: RekapRange) =>
    api.get<ApiResult<RekapBrowseItem[]>>(BASE, { params }),

  getDetail: (params: RekapRange) =>
    api.get<ApiResult<RekapDetailRow[]>>(`${BASE}/detail`, { params }),

  batalData: (nomor: string, alasan: string) =>
    api.patch<ApiResult<null>>(`${BASE}/${encodeURIComponent(nomor)}/batal`, {
      alasan,
    }),

  deleteData: (nomor: string) =>
    api.delete<ApiResult<null>>(`${BASE}/${encodeURIComponent(nomor)}`),
};
