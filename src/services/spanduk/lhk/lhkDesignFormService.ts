import api from "@/services/api";
import type { AxiosResponse } from "axios";

export { pesanError } from "@/services/spanduk/daftar/masterBahanService";

const BASE = "/spanduk/lhk/lhk-design-form";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface LhkDesignStatus {
  Kode_Cabang: string | null;
  Designer: string | null;
  Status: string;
  Tanggal: string | null;
  Jam: string | null;
  Durasi: string | null;
  Catatan: string | null;
}

export interface LhkDesignKomponen {
  Bahan: string | null;
  Panjang: number;
  Jumlah: number;
  Total: number;
  C: number;
  M: number;
  Y: number;
  K: number;
  Mesin: string | null;
  Keterangan: string | null;
}

export interface LhkDesignForm {
  Nomor: string;
  Jenis: "SPK" | "MAP";
  Nama_SPK: string | null;
  Tanggal_SPK: string | null;
  Dateline: string | null;
  Finishing: string | null;
  Ada: boolean;
  Nomor_LHK: string | null;
  Tanggal_LHK: string | null;
  User_Create: string | null;
  Status_Terakhir: string | null;
  Status: LhkDesignStatus[];
  Komponen: LhkDesignKomponen[];
  Server_Sekarang: string;
}

export interface KomponenPayload {
  Bahan: string;
  Panjang: number;
  Jumlah: number;
  C: number;
  M: number;
  Y: number;
  K: number;
  Mesin: string;
  Keterangan: string;
}

export interface LhkDesignBatchPayload {
  Tanggal: string;
  Daftar: { Nomor_SPK: string; Komponen: KomponenPayload[] }[];
}

export type StatusSesi = "BERJALAN" | "PAUSE" | "SELESAI" | "BATAL";

export interface SesiMap {
  Nomor_SPK: string;
  Nomor_LHK: string | null;
  Nama_SPK: string;
  Porsi_Persen: number | null;
  Durasi_Detik: number | null;
}

export interface PauseAktif {
  Mulai: string;
  Alasan: string;
  Berjalan_Detik: number;
  Sisa_Detik: number;
}

export interface SesiTimer {
  Sesi_Id: number;
  Status: StatusSesi;
  Kode_Cabang: string;
  Designer: string;
  Catatan: string;
  Mulai: string;
  Selesai: string | null;
  Server_Sekarang: string;
  Pause_Detik: number;
  Pause_Aktif: PauseAktif | null;
  Batas_Pause_Menit: number;
  Durasi_Bersih_Detik: number | null;
  Daftar: SesiMap[];
  Header_Dipertahankan?: string[];
}

export interface MulaiPayload {
  Kode_Cabang: string;
  Designer: string;
  Catatan: string;
  Daftar_Spk: string[];
}

export interface SelesaiPayload {
  Catatan: string;
  Porsi?: { Nomor_SPK: string; Persen: number }[];
}

export interface DesignerOption {
  Kode: string;
  Nama: string | null;
  Designer: string;
}

export interface MesinOption {
  Kode: string;
  Nama: string | null;
  Keterangan: string | null;
}

export interface BahanOption {
  Kode: string;
}

export type SaveResponse = AxiosResponse<ApiResponse<string[]>>;

const path = (nomor: string) => `${BASE}/${encodeURIComponent(nomor)}`;

export const getById = async (nomor: string): Promise<LhkDesignForm> => {
  const res = await api.get<ApiResponse<LhkDesignForm>>(path(nomor));
  return res.data.data;
};

export const getLookupDesigner = async (): Promise<DesignerOption[]> => {
  const res = await api.get<ApiResponse<DesignerOption[]>>(
    `${BASE}/lookup/designer`,
  );
  return res.data.data ?? [];
};

export const getLookupMesin = async (): Promise<MesinOption[]> => {
  const res = await api.get<ApiResponse<MesinOption[]>>(`${BASE}/lookup/mesin`);
  return res.data.data ?? [];
};

export const getLookupBahan = async (): Promise<BahanOption[]> => {
  const res = await api.get<ApiResponse<BahanOption[]>>(`${BASE}/lookup/bahan`);
  return res.data.data ?? [];
};

// Simpan beberapa tab sekaligus (tanggal sama, semua atau tidak sama sekali)
export const simpanBatch = (
  payload: LhkDesignBatchPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<string[]>>(`${BASE}/simpan`, payload);

// ── Sesi timer ──
export const getSesiAktif = async (): Promise<SesiTimer | null> => {
  const res = await api.get<ApiResponse<SesiTimer | null>>(
    `${BASE}/sesi/aktif`,
  );
  return res.data.data ?? null;
};

export const mulaiSesi = async (payload: MulaiPayload): Promise<SesiTimer> => {
  const res = await api.post<ApiResponse<SesiTimer>>(
    `${BASE}/sesi/mulai`,
    payload,
  );
  return res.data.data;
};

export const pauseSesi = async (
  id: number,
  alasan: string,
): Promise<SesiTimer> => {
  const res = await api.post<ApiResponse<SesiTimer>>(
    `${BASE}/sesi/${id}/pause`,
    { Alasan: alasan },
  );
  return res.data.data;
};

export const resumeSesi = async (id: number): Promise<SesiTimer> => {
  const res = await api.post<ApiResponse<SesiTimer>>(
    `${BASE}/sesi/${id}/resume`,
  );
  return res.data.data;
};

export const selesaiSesi = async (
  id: number,
  payload: SelesaiPayload,
): Promise<SesiTimer> => {
  const res = await api.post<ApiResponse<SesiTimer>>(
    `${BASE}/sesi/${id}/selesai`,
    payload,
  );
  return res.data.data;
};

export const batalSesi = async (id: number): Promise<SesiTimer> => {
  const res = await api.post<ApiResponse<SesiTimer>>(
    `${BASE}/sesi/${id}/batal`,
  );
  return res.data.data;
};
