import api from "@/services/api";

const BASE = "/ppic/lhk-marker-form";

export const lhkMarkerFormService = {
  getDetail: (nomor: string) => api.get(`${BASE}/${encodeURIComponent(nomor)}`),
  create: (payload: any) => api.post(BASE, payload),
  update: (nomor: string, payload: any) =>
    api.put(`${BASE}/${encodeURIComponent(nomor)}`, payload),
  deleteData: (nomor: string) =>
    api.delete(`${BASE}/${encodeURIComponent(nomor)}`),
  searchSpk: (q: string) =>
    api.get(`${BASE}/lookup/search-spk`, { params: { q } }),
  getSpkByNomor: (nomor: string) =>
    api.get(`${BASE}/lookup/spk/${encodeURIComponent(nomor)}`),
  uploadGambar: (file: File, lhkNomor: string, spkNomor: string) => {
    const formData = new FormData();
    formData.append("gambar", file);
    formData.append("lhkNomor", lhkNomor);
    formData.append("tab", "marker");
    formData.append("spkNomor", spkNomor);
    return api.post(`${BASE}/upload-gambar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
