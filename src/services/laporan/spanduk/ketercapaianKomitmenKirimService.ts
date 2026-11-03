import api from "@/services/api";

export interface KetercapaianRincian {
  Nomor: string;
  Tanggal: string;
  Qty: number;
}

export interface KetercapaianDetailRow {
  PjwdId: number;
  So_Nomor: string;
  So_Nama: string | null;
  Panjang: number;
  Lebar: number;
  Qty_Order: number;
  Permintaan_Qty: number;
  Permintaan_Tgl: string | null;
  Estimasi_Qty: number;
  Estimasi_Mtr: number;
  Estimasi_Tgl: string | null;
  Stbj_Qty: number;
  Stbj_Mtr: number;
  Stbj_Tgl: string | null;
  Stbj_Rincian: KetercapaianRincian[];
  Aktual_Qty: number;
  Aktual_Mtr: number;
  Aktual_Tgl: string | null;
  Aktual_Rincian: KetercapaianRincian[];
}

export interface KetercapaianRow {
  Nomor: string;
  TglAwal: string;
  TglAkhir: string;
  Cabang: string;
  Close: string;
  Keterangan: string | null;
  Planning_Qty: number;
  Planning_Mtr: number;
  Stbj_Qty: number;
  Stbj_Mtr: number;
  Aktual_Qty: number;
  Aktual_Mtr: number;
  Detail: KetercapaianDetailRow[];
}

export interface KetercapaianParams {
  tglAwal: string;
  tglAkhir: string;
  cabang?: string;
}

interface ApiResult<T> {
  success: boolean;
  data: T;
  message?: string;
}

const BASE = "/laporan/spanduk/ketercapaian-komitmen-kirim";

export const ketercapaianKomitmenKirimService = {
  getBrowse: (params: KetercapaianParams) =>
    api.get<ApiResult<KetercapaianRow[]>>(BASE, { params }),
};
