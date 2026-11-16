import api from "@/services/api";

const BASE_URL = "/mmt/surat-jalan";

export interface BrowseSjParams {
  startDate: string;
  endDate: string;
  zcus?: number;
  zdivisi?: number;
  [key: string]: any;
}

export interface ApprovalLookupParams {
  startDate?: string;
  endDate?: string;
  cab?: string;
  zcus?: number;
  pendingOnly?: boolean | string;
  [key: string]: any;
}

export interface PengajuanEditPayload {
  nomor: string;
  tanggal: string;
  keterangan?: string;
  urut: number;
  alasan: string;
}

export const suratJalanService = {
  // ==========================================
  // 1. MODUL BROWSE TRANSAKSI UTAMA (ufrmBrowseSJ)
  // ==========================================

  // 1. Mengambil list master Surat Jalan (Query: startDate, endDate, zcus, zdivisi)
  getBrowse: (params: BrowseSjParams) => api.get(BASE_URL, { params }),

  // 2. Mengambil detail Surat Jalan berdasarkan Nomor SJ
  // (Mendukung parameter berupa String 'SJ-001' ATAU Object { nomor: 'SJ-001' })
  getDetail: (params: string | { nomor: string; [key: string]: any }) => {
    const p = typeof params === "string" ? { nomor: params } : params;
    return api.get(`${BASE_URL}/detail`, { params: p });
  },

  // Mengambil detail untuk banyak nomor SJ sekaligus (bulk)
  getDetailBulk: (nomorList: string[]) =>
    api.post(`${BASE_URL}/detail-bulk`, { nomorList }),

  // Helper alias untuk kompatibilitas pencetakan/view
  getDataCetak: (nomor: string) =>
    api.get(`${BASE_URL}/detail`, { params: { nomor } }),

  // 3. Cek urutan pengajuan edit terakhir untuk nomor SJ tertentu
  getUrutPengajuan: (nomor: string) =>
    api.get(`${BASE_URL}/pengajuan/urut/${encodeURIComponent(nomor)}`),

  // 4. Submit form pengajuan edit / perubahan data
  submitPengajuan: (payload: PengajuanEditPayload) =>
    api.post(`${BASE_URL}/pengajuan`, payload),

  // 5. Menghapus Surat Jalan
  deleteSj: (
    nomor: string,
    params?: { invoice?: string; approved?: string; [key: string]: any },
  ) => api.delete(`${BASE_URL}/${encodeURIComponent(nomor)}`, { params }),

  // ==========================================
  // 2. MODUL APPROVAL SURAT JALAN (ufrmApproveSJ)
  // ==========================================

  // 6. Lookup Data Master Approval SJ
  getApprovalLookup: (params: ApprovalLookupParams) =>
    api.get(`${BASE_URL}/approval/lookup`, { params }),

  // 7. Lookup Data Detail Approval SJ
  getApprovalLookupDetails: (params: { nomor?: string; [key: string]: any }) =>
    api.get(`${BASE_URL}/approval/lookup/details`, { params }),

  // ==========================================
  // 3. ACTION TOMBOL APPROVAL / PENDING / BATAL
  // ==========================================

  // 8. Approve Surat Jalan
  // Bisa dipanggil tanpa param (body payload), atau dengan parameter `nomor` di URL
  approveSj: (nomor?: string, payload?: any) => {
    if (nomor) {
      return api.post(
        `${BASE_URL}/approve/${encodeURIComponent(nomor)}`,
        payload,
      );
    }
    return api.post(`${BASE_URL}/approve`, payload);
  },

  // 9. Pending Surat Jalan (Batal Approve)
  pendingSj: (nomor?: string, payload?: any) => {
    if (nomor) {
      return api.post(
        `${BASE_URL}/pending/${encodeURIComponent(nomor)}`,
        payload,
      );
    }
    return api.post(`${BASE_URL}/pending`, payload);
  },

  // 10. Batal Surat Jalan
  batalSj: (nomor?: string, payload?: any) => {
    if (nomor) {
      return api.post(
        `${BASE_URL}/batal/${encodeURIComponent(nomor)}`,
        payload,
      );
    }
    return api.post(`${BASE_URL}/batal`, payload);
  },
};

export default suratJalanService;
