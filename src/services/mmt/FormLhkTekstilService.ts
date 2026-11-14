import api from "@/services/api";

export const lhkTekstilMmtService = {
  // 1. Mengambil seluruh daftar data LHK untuk datatable halaman utama
  // Sesuai route backend: router.get('/', ...)
  getList: (params?: any) =>
    api.get("/mmt/lhk-tekstil-mmt", { params }),

  // 2. Mengambil data lookup pendukung LHK
  // Sesuai route backend: router.get('/lookup', ...)
  getLookup: () =>
    api.get("/mmt/lhk-tekstil-mmt/lookup"),

  // 3. Mengambil detail data LHK berdasarkan nomor untuk EDIT MODE / LOAD DATA LAMA
  // Sesuai route backend: router.get('/:nomor', ...)
  getDetail: (nomor: string) =>
    api.get(`/mmt/lhk-tekstil-mmt/${encodeURIComponent(nomor)}`),

  // 4. Menyimpan data LHK (Baik data Baru maupun Edit Mode dikirim via POST)
  // Sesuai route backend: router.post('/', ...)
  // Di backend saveLhk Anda, logika INSERT/UPDATE sudah di-handle otomatis berdasarkan isi 'header.nomor'
  saveData: async (payload: any) => {
    return await api.post("/mmt/lhk-tekstil-mmt", payload);
  },

  // 5. Menghapus data LHK berdasarkan nomor dokumen
  // Sesuai route backend: router.delete('/:nomor', ...)
  deleteData: (nomor: string) =>
    api.get(`/mmt/lhk-tekstil-mmt/${encodeURIComponent(nomor)}`),

  // --- Tambahan Endpoint Approval Sesuai Route Backend Anda ---
  
  // Ambil history approval list
  // Sesuai route backend: router.get('/approval-list', ...)
  getApprovalList: (params?: any) =>
    api.get("/mmt/lhk-tekstil-mmt/approval-list", { params }),

  // Ambil detail data full history approval berdasarkan nomor
  // Sesuai route backend: router.get('/approval/:nomor', ...)
  getApprovalFullData: (nomor: string) =>
    api.get(`/mmt/lhk-tekstil-mmt/approval/${encodeURIComponent(nomor)}`),

  // Proses submit pin/save approval tindakan
  // Sesuai route backend: router.post('/approve', ...)
  submitApproval: (payload: { nomor: string; pin: string; status: string }) =>
    api.post("/mmt/lhk-tekstil-mmt/approve", payload),
};