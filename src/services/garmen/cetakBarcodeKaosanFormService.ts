import api from "@/services/api";

const BASE = "/garmen/bahan-jadi/cetak-barcode-kaosan/form";

export const cetakBarcodeKaosanFormService = {
  getDetail: (nomor: string) =>
    api.get(`${BASE}/${encodeURIComponent(nomor)}/detail`),
  lookupSpk: (nomor: string) =>
    api.get(`${BASE}/lookup-spk/${encodeURIComponent(nomor)}`),
  lookupKodeKaosan: (kode: string) =>
    api.get(`${BASE}/lookup-kaosan/${encodeURIComponent(kode)}`),
  lookupByBarcode: (barcode: string) =>
    api.get(`${BASE}/lookup-barcode/${encodeURIComponent(barcode)}`),
  searchKaosanMaster: (q: string, limit = 50) =>
    api.get(`${BASE}/search-kaosan-master`, { params: { q, limit } }),
  previewPrint: (payload: any) => api.post(`${BASE}/preview-print`, payload),
  save: (payload: any) =>
    payload.isEdit
      ? api.put(`${BASE}/save`, payload)
      : api.post(`${BASE}/save`, payload),
};
