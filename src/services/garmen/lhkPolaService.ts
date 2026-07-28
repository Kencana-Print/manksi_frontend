import api from "@/services/api";

const BASE = "/garmen/lhk-pola";
const FORM_BASE = "/garmen/lhk-pola-form";

export const lhkPolaService = {
  // ── Browse ──
  getBrowse: (params: { startDate: string; endDate: string }) =>
    api.get(BASE, { params }),

  // ── Form — semua endpoint ini ada di base FORM, bukan base browse ──
  getDetail: (nomor: string) =>
    api.get(`${FORM_BASE}/${encodeURIComponent(nomor)}`),

  save: (payload: any) => api.post(FORM_BASE, payload),

  update: (nomor: string, payload: any) =>
    api.put(`${FORM_BASE}/${encodeURIComponent(nomor)}`, payload),

  deleteData: (nomor: string) =>
    api.delete(`${FORM_BASE}/${encodeURIComponent(nomor)}`),

  // ⚠️ Field name HARUS "gambar" (bukan "file") — sesuai
  // upload.single("gambar") di uploadMiddleware pada route ini.
  uploadGambarDetail: (
    lhkNomor: string,
    tab: "marker" | "grading",
    spkNomor: string,
    file: File,
  ) => {
    const formData = new FormData();
    formData.append("gambar", file);
    formData.append("lhkNomor", lhkNomor);
    formData.append("tab", tab);
    formData.append("spkNomor", spkNomor);
    return api.post(`${FORM_BASE}/upload-gambar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  searchSpk: (q: string) =>
    api.get(`${FORM_BASE}/lookup/search-spk`, { params: { q } }),

  getSpkByNomor: (nomor: string) =>
    api.get(`${FORM_BASE}/lookup/spk/${encodeURIComponent(nomor)}`),
};
