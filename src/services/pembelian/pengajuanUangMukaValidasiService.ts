import api from "@/services/api";

export interface ValidasiInfo {
  berlaku: boolean;
  status: "BELUM" | "VALID" | "TIDAK_BERLAKU";
  nama: string;
  bagian: string;
  tanggal_fmt: string;
  boleh_validasi: boolean;
  boleh_batal: boolean;
}

interface ValidasiResponse {
  success: boolean;
  data: ValidasiInfo;
}

const BASE = "/pembelian/pengajuan-uang-muka";
const enc = (nomor: string) => encodeURIComponent(nomor);

export const pengajuanUangMukaValidasiService = {
  async getStatus(nomor: string): Promise<ValidasiInfo> {
    const res = await api.get<ValidasiResponse>(
      `${BASE}/${enc(nomor)}/validasi`,
    );
    return res.data.data;
  },
  async validasi(nomor: string): Promise<ValidasiInfo> {
    const res = await api.post<ValidasiResponse>(
      `${BASE}/${enc(nomor)}/validasi`,
    );
    return res.data.data;
  },
  async batal(nomor: string, alasan: string): Promise<ValidasiInfo> {
    const res = await api.post<ValidasiResponse>(
      `${BASE}/${enc(nomor)}/batal-validasi`,
      { alasan },
    );
    return res.data.data;
  },
  async getStatusPenyelesaian(bon: string): Promise<ValidasiInfo> {
    const res = await api.get<ValidasiResponse>(
      `${BASE}/penyelesaian/${enc(bon)}/validasi`,
    );
    return res.data.data;
  },
  async validasiPenyelesaian(bon: string): Promise<ValidasiInfo> {
    const res = await api.post<ValidasiResponse>(
      `${BASE}/penyelesaian/${enc(bon)}/validasi`,
    );
    return res.data.data;
  },
  async batalPenyelesaian(bon: string, alasan: string): Promise<ValidasiInfo> {
    const res = await api.post<ValidasiResponse>(
      `${BASE}/penyelesaian/${enc(bon)}/batal-validasi`,
      { alasan },
    );
    return res.data.data;
  },
};
