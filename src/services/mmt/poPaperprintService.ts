import api from "@/services/api";

const BASE_URL = "/mmt/po-paperprint";

export const poPaperprintService = {
  // 1. Ambil opsi dropdown (cabang, ukuran, bahan)
  getMeta: () => {
    return api.get(`${BASE_URL}/meta`);
  },

  // 2. Ambil data lengkap 1 PO untuk mode Edit
  getFormData: (nomor: string) => {
    return api.get(`${BASE_URL}/${encodeURIComponent(nomor)}`);
  },

  // 3. Auto-resolve Supplier berdasarkan Kode saat Blur/Enter
  resolveSupplier: (kode: string) => {
    return api.get(`${BASE_URL}/resolve-supplier`, {
      params: { kode },
    });
  },

  // 4. Auto-resolve SPK berdasarkan Kode/Nomor saat Blur/Enter
  resolveSpk: (kode: string) => {
    return api.get(`${BASE_URL}/resolve-spk`, {
      params: { kode },
    });
  },

  // 5. Simpan Baru (POST dengan FormData)
  create: (formData: FormData) => {
    return api.post(`${BASE_URL}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // 6. Edit/Update (PUT dengan FormData)
  update: (nomor: string, formData: FormData) => {
    return api.put(`${BASE_URL}/${encodeURIComponent(nomor)}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
