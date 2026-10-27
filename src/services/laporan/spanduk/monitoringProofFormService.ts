import api from "@/services/api";

const BASE = "/laporan/spanduk/monitoring-proof-form";

export interface MonitoringProofFormData {
  Nomor: string;
  Tanggal: string | null;
  Deadline: string | null;
  Perush_Kode: string | null;
  Perush_Nama: string | null;
  Nama: string | null;
  Jumlah: number;
  Panjang: number;
  Lebar: number;
  Gramasi: string | null;
  Kain: string | null;
  Rencana_Order: number;
  Workshop: string | null;
  Keterangan: string | null;
  Ada_Proof: boolean;
  Tgl_Proof: string | null;
  Jml_Proof: number;
  Gudang_Kode: string;
  Gudang_Nama: string;
  Status: string;
  Tg_Status: string | null;
  Arsip: string;
}

export interface MapOption {
  Nomor: string;
  Tanggal: string | null;
  Jenis: string | null;
  Nama: string | null;
}

export interface GudangOption {
  Kode: string;
  Nama: string;
}

export interface MonitoringProofPayload {
  jumlahProof: number;
  gudang: string;
  tglProof: string;
  tglStatus: string;
  status: string;
  arsip: string;
}

export interface SaveResponse {
  success: boolean;
  data?: { nomor: string; baru: boolean };
}

export const pesanError = (e: unknown, fallback: string): string =>
  (e as { response?: { data?: { message?: string } } })?.response?.data
    ?.message || fallback;

export const getById = async (
  nomor: string,
): Promise<MonitoringProofFormData> => {
  const res = await api.get<{
    success: boolean;
    data: MonitoringProofFormData;
  }>(`${BASE}/${encodeURIComponent(nomor)}`);
  return res.data.data;
};

export const simpan = async (
  nomor: string,
  payload: MonitoringProofPayload,
): Promise<SaveResponse> => {
  const res = await api.put<SaveResponse>(
    `${BASE}/${encodeURIComponent(nomor)}`,
    payload,
  );
  return res.data;
};

export const getGudang = async (): Promise<GudangOption[]> => {
  const res = await api.get<{ success: boolean; data: GudangOption[] }>(
    `${BASE}/gudang`,
  );
  return res.data.data ?? [];
};

export const getDaftarMap = async (cari: string): Promise<MapOption[]> => {
  const res = await api.get<{ success: boolean; data: MapOption[] }>(
    `${BASE}/daftar-map`,
    { params: { cari } },
  );
  return res.data.data ?? [];
};
