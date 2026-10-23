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
  Tanggal_LHK: string | null;
  User_Create: string | null;
  Status_Terakhir: string | null;
  Status: LhkDesignStatus[];
  Komponen: LhkDesignKomponen[];
  Server_Sekarang: string;
}

export interface LhkDesignPayload {
  Tanggal: string;
  Komponen: {
    Bahan: string;
    Panjang: number;
    Jumlah: number;
    C: number;
    M: number;
    Y: number;
    K: number;
    Mesin: string;
    Keterangan: string;
  }[];
}

export interface AksiPayload {
  Kode_Cabang: string;
  Designer: string;
  Catatan: string;
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

export type SaveResponse = AxiosResponse<ApiResponse<LhkDesignForm>>;

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

export const simpan = (
  nomor: string,
  payload: LhkDesignPayload,
): Promise<SaveResponse> =>
  api.put<ApiResponse<LhkDesignForm>>(path(nomor), payload);

export const mulai = async (
  nomor: string,
  payload: AksiPayload,
): Promise<LhkDesignForm> => {
  const res = await api.post<ApiResponse<LhkDesignForm>>(
    `${path(nomor)}/mulai`,
    payload,
  );
  return res.data.data;
};

export const selesai = async (
  nomor: string,
  payload: AksiPayload,
): Promise<LhkDesignForm> => {
  const res = await api.post<ApiResponse<LhkDesignForm>>(
    `${path(nomor)}/selesai`,
    payload,
  );
  return res.data.data;
};
