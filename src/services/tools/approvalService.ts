import api from "@/services/api";

export const approvalService = {
  // --- Piutang > 90 Hari ---
  getPiutangMaster: (params: any) =>
    api.get("/tools/approval/piutang", { params }),
  getPiutangPengajuan: (cusKode: string, params: any) =>
    api.get(
      `/tools/approval/piutang/${encodeURIComponent(cusKode)}/pengajuan`,
      { params },
    ),
  getPiutangInvoice: (cusKode: string, status: string, params: any) =>
    api.get(
      `/tools/approval/piutang/${encodeURIComponent(cusKode)}/invoice/${encodeURIComponent(status)}`,
      { params },
    ),
  submitPiutangOtorisasi: (payload: {
    spk_nomor: string;
    status_acc: string;
  }) => api.post("/tools/approval/piutang/otorisasi", payload),

  // --- SPK Harga 0 (TAMBAHAN BARU) ---
  getHargaNolList: (params: any) =>
    api.get("/tools/approval/harga-nol", { params }),
  getHargaNolDetailInfo: (nomor: string) =>
    api.get(`/tools/approval/harga-nol/${encodeURIComponent(nomor)}/info`),
  submitHargaNolOtorisasi: (payload: {
    spk_nomor: string;
    status_acc: string;
  }) => api.post("/tools/approval/harga-nol/otorisasi", payload),

  // --- SPK KLIEN PRIORITAS (MENU_ID: 258) ---
  getPrioritasList: (params: any) =>
    api.get("/tools/approval/prioritas", { params }),
  submitPrioritasOtorisasi: (payload: {
    spk_nomor: string;
    status_acc: string;
  }) => api.post("/tools/approval/prioritas/otorisasi", payload),

  // --- INVOICE BELUM BUAT SJ (MENU_ID: 260) ---
  getInvoiceBlmSjList: (params: any) =>
    api.get("/tools/approval/invoice-blm-sj", { params }),
  submitInvoiceBlmSjOtorisasi: (payload: {
    nomor: string;
    status_acc: string;
  }) => api.post("/tools/approval/invoice-blm-sj/otorisasi", payload),

  // --- PERUBAHAN DATA (MENU_ID: 259) ---
  getPerubahanDataList: (params: any) =>
    api.get("/tools/approval/perubahan-data", { params }),
  submitPerubahanDataOtorisasi: (payload: {
    nomor: string;
    transaksi: string;
    urut: number;
    status_acc: string;
  }) => api.post("/tools/approval/perubahan-data/otorisasi", payload),

  // --- HAPUS DATA (MENU_ID: 261) ---
  getHapusDataList: (params: any) =>
    api.get("/tools/approval/hapus-data", { params }),
  submitHapusDataOtorisasi: (payload: {
    nomor: string;
    transaksi: string;
    urut: number;
    status_acc: string;
  }) => api.post("/tools/approval/hapus-data/otorisasi", payload),

  // --- PLAFON CUSTOMER MANAGER (MENU_ID: 262) ---
  getPlafonList: (params: any) => api.get("/tools/approval/plafon", { params }),
  submitPlafonOtorisasi: (payload: { cus_kode: string; status_acc: string }) =>
    api.post("/tools/approval/plafon/otorisasi", payload),

  // --- PLAFON CUSTOMER DIREKSI (MENU_ID: 263) ---
  getPlafonDireksiList: (params: any) =>
    api.get("/tools/approval/plafon-direksi", { params }),
  submitPlafonDireksiOtorisasi: (payload: {
    cus_kode: string;
    status_acc: string;
  }) => api.post("/tools/approval/plafon-direksi/otorisasi", payload),

  // --- MUTASI TANPA PLAN (MENU_ID: 266) ---
  getMutasiNoPlanList: (params: any) =>
    api.get("/tools/approval/mutasi-noplan", { params }),

  submitMutasiNoPlanOtorisasi: (payload: {
    nomor: string;
    status_acc: string;
  }) => api.post("/tools/approval/mutasi-noplan/otorisasi", payload),
};
