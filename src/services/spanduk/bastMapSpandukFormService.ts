import api from "@/services/api";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/bast-map-form";

export interface MapOption {
  Nomor: string;
  Tanggal: string;
  NamaPekerjaan: string | null;
  NamaExt: string | null;
  Ukuran: string | null;
}

export interface BahanOption {
  Kode: string | number;
  Nama: string | null;
  Satuan: string | null;
}

export interface BastMapHeader {
  mspk_nomor: string;
  mspk_tanggal: string;
  mspk_nama: string | null;
  mspk_nama2: string | null;
  mspk_ukuran: string | null;
  mspk_kain: string | null;
  mspk_finishing: string | null;
  mspk_keterangan: string | null;
  mspk_kendala: string | null;
  mspk_jumlah_jadi: number | null;
  mspk_tipe: string | null;
  jenis_order: string | null;
  nomor_lhk_proof: string | null;
  tgl_buat_map: string | null;
  hari_pembuatan: number | null;
  batas_hari: number;
  terlambat: number;
}

export interface KesesuaianRow {
  no: number;
  kesesuaian: string;
  status: "Y" | "N";
  keterangan: string;
  user_create: string | null;
  date_create: string | null;
  user_modify: string | null;
  date_modify: string | null;
}

export interface BastMapFormData {
  header: BastMapHeader;
  sudahAda: boolean;
  checklist: KesesuaianRow[];
  bahan: BahanOption[];
  peringatan: string;
}

export interface BastMapPayload {
  nomor: string;
  jumlahJadi: number;
  kendala: string;
  tipe: string;
  checklist: { no: number; status: "Y" | "N"; keterangan: string }[];
  bahan: { kode: string }[];
}

export interface SaveResponse {
  data?: { message?: string; nomor?: string };
}

export interface BastMapPrintHeader {
  mspk_nomor: string;
  mspk_tanggal: string;
  mspk_cab: string | null;
  mspk_nama: string | null;
  mspk_ukuran: string | null;
  mspk_kain: string | null;
  mspk_finishing: string | null;
  mspk_keterangan: string | null;
  mspk_jumlah_jadi: number | null;
  mspk_tipe: string | null;
  mspk_kendala: string | null;
}

export interface BastMapPrintData {
  header: BastMapPrintHeader;
  details: {
    no: number;
    kesesuaian: string;
    status: string;
    keterangan: string | null;
  }[];
}

export const getLookupMap = async (search: string): Promise<MapOption[]> => {
  const res = await api.get<{ data: MapOption[] }>(`${BASE}/lookups/map`, {
    params: { search },
  });
  return res.data.data ?? [];
};

export const getLookupBahan = async (
  search: string,
): Promise<BahanOption[]> => {
  const res = await api.get<{ data: BahanOption[] }>(`${BASE}/lookups/bahan`, {
    params: { search },
  });
  return res.data.data ?? [];
};

export const getById = async (nomor: string): Promise<BastMapFormData> => {
  const res = await api.get<{ data: BastMapFormData }>(
    `${BASE}/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const getPrintData = async (
  nomor: string,
): Promise<BastMapPrintData> => {
  const res = await api.get<{ data: BastMapPrintData }>(
    `${BASE}/print/${encodeURIComponent(nomor)}`,
  );
  return res.data.data;
};

export const create = (payload: BastMapPayload): Promise<SaveResponse> =>
  api.post(BASE, payload);

export const update = (
  nomor: string,
  payload: BastMapPayload,
): Promise<SaveResponse> =>
  api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload);

export const setKeputusan = (
  nomor: string,
  payload: { keputusan: "LANJUT" | "ULANG"; alasan: string },
) => api.put(`${BASE}/${encodeURIComponent(nomor)}/keputusan`, payload);
