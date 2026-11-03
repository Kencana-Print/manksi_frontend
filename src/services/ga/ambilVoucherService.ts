import api from "@/services/api";

export interface VoucherRow {
  Kode: string;
  Id: number;
  Tanggal: string;
  NamaSpbu: string;
  Nopol: string;
  Nama_Pengguna: string;
  Odometer: number;
  NamaBBM: string;
  Jumlah: number;
}

export interface VoucherFormData {
  no_voucher?: string;
  id?: number | null;
  tanggal: string;
  id_spbu: number | null;
  kode_pengguna: string;
  nopol: string;
  odometer: number;
  id_bbm: number | null;
  jumlah: number;
}

export interface VoucherDetailResponse extends VoucherFormData {
  namaspbu?: string;
  nama_pengguna?: string;
  namabbm?: string;
}

export interface VoucherLookups {
  spbu: Array<{ id: number; nama: string; alamat: string }>;
  pengguna: Array<{ kode: string; nama: string }>;
  kendaraan: Array<{ nopol: string; keterangan: string; stat: string }>;
  bbm: Array<{ id: number; nama: string }>;
}

export const ambilVoucherService = {
  getBrowse: (params: { tglAwal: string; tglAkhir: string }) =>
    api.get<{ success: boolean; data: VoucherRow[] }>("/ga/ambil-voucher", {
      params,
    }),

  getLookups: () =>
    api.get<{ success: boolean; data: VoucherLookups }>(
      "/ga/ambil-voucher/lookups",
    ),

  getMaxKode: () =>
    api.get<{
      success: boolean;
      data: { no_voucher: string; id: number };
    }>("/ga/ambil-voucher/max-kode"),

  getById: (kode: string, id: number | string) =>
    api.get<{
      success: boolean;
      data: VoucherDetailResponse;
    }>(`/ga/ambil-voucher/${encodeURIComponent(kode)}/${encodeURIComponent(id)}`),

  create: (payload: VoucherFormData) =>
    api.post<{
      success: boolean;
      message: string;
      data: { no_voucher: string; id: number };
    }>("/ga/ambil-voucher", payload),

  update: (kode: string, id: number | string, payload: VoucherFormData) =>
    api.put<{
      success: boolean;
      message: string;
      data: { no_voucher: string; id: number };
    }>(
      `/ga/ambil-voucher/${encodeURIComponent(kode)}/${encodeURIComponent(id)}`,
      payload,
    ),

  deleteData: (kode: string, id: number | string) =>
    api.delete<{ success: boolean; message: string }>(
      `/ga/ambil-voucher/${encodeURIComponent(kode)}/${encodeURIComponent(id)}`,
    ),
};
