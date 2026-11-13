import api from "@/services/api";

// CEK: samakan dengan base path di pengajuanUangMukaService.getBrowse
const BASE = "/pembelian/pengajuan-uang-muka";
// Terkonfirmasi dari uangMukaRealisasiService.ts
const BASE_REALISASI = "/pembelian/uang-muka-realisasi/petty-cash";

export interface PettyCashRow {
  Nomor: string;
  Tanggal: string;
  Keterangan: string;
  Cabang: string;
  Status: string;
  Nominal: number | string;
  UserCreate: string;
  UserRealisasi: string | null;
  TglRealisasi: string | null;
  LaciKode: string;
  LaciNama: string | null;
  LaciAsal: string | null;
  AlasanTolak: string | null;
  TransferJurNo: string | null;
  KonfirmasiTgl: string | null;
  ValAksi: string | null;
  KonfirmasiStatus: "" | "SUDAH" | "BELUM";
}

export interface InfoLaci {
  kode: string;
  nama: string;
  saldo: number;
  batas: number;
  belumSelesai: number;
  tersedia: number;
}

export interface SumberDana {
  kode: string;
  nama: string;
}

export interface RealisasiPettyCashDetail {
  pum_nomor: string;
  pum_tanggal: string;
  pum_keterangan: string;
  pum_cabang: string;
  pum_user_create: string;
  nominal: number;
  mandiri: boolean;
  boleh_realisasi: boolean;
  validasi_ok: boolean;
  laci_kode: string;
  laci_nama: string;
  saldo_laci: number;
  batas: number;
  sumber_options: SumberDana[];
  sumber_default: string;
  cutoff: string;
}

export interface RealisasiPettyCashPayload {
  aksi: "REALISASI" | "TOLAK";
  sumber: string;
  tanggal: string;
  alasan: string;
}

export interface RealisasiPettyCashResult {
  nomor: string;
  status: "REALISASI" | "DITOLAK";
  totalNominal: number;
  transferJurNo: string;
  laciTujuan?: string;
  laciAsal?: string;
}

export interface PettyCashBrowseParams {
  startDate?: string;
  endDate?: string;
  cabang?: string;
}

export interface PettyCashCreatePayload {
  tanggal: string;
  keterangan: string;
  nominal: number;
}

export interface PenyerahanItem {
  sumber: string;
  nomorHeader: string;
  itemNourut: number;
  nama: string;
  satuan: string;
  qty: number;
  keterangan: string;
  nominalAsli: number;
}
export interface PenyerahanPayload {
  tanggal: string;
  keterangan: string;
  nominal: number;
  items: PenyerahanItem[];
}
export interface PenyerahanResult {
  nomor: string;
  bonNomor: string;
  totalNominal: number;
  laciKode: string;
}

export const pettyCashService = {
  getBrowse(params: PettyCashBrowseParams = {}) {
    return api.get<PettyCashRow[]>(`${BASE}/petty-cash`, { params });
  },
  getInfoLaci() {
    return api.get<InfoLaci>(`${BASE}/petty-cash/laci-saya`);
  },
  create(payload: PettyCashCreatePayload) {
    return api.post<{
      nomor: string;
      totalNominal: number;
      laciTujuan: string;
    }>(`${BASE}/petty-cash`, payload);
  },
  createPenyerahan: (payload: PenyerahanPayload) =>
    api.post<PenyerahanResult>(`${BASE}/petty-cash/penyerahan`, payload),
  batalPenyerahan: (nomor: string, alasan: string) =>
    api.post<{ nomor: string; bonNomor: string }>(
      `${BASE}/petty-cash/${encodeURIComponent(nomor)}/batal`,
      { alasan },
    ),
  getRealisasiDetail(nomor: string) {
    return api.get<RealisasiPettyCashDetail>(
      `${BASE_REALISASI}/${encodeURIComponent(nomor)}`,
    );
  },
  saveRealisasi(nomor: string, payload: RealisasiPettyCashPayload) {
    return api.post<RealisasiPettyCashResult>(
      `${BASE_REALISASI}/${encodeURIComponent(nomor)}/realisasi`,
      payload,
    );
  },
  konfirmasiTerima(nomor: string) {
    return api.post<{ nomor: string }>(
      `${BASE_REALISASI}/${encodeURIComponent(nomor)}/konfirmasi-terima`,
    );
  },
};
