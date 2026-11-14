import api from "@/services/api";

const BASE = "/mmt/komitmen-kirim";

export const komitmenKirimService = {
  // Browse
  getBrowse: (params: any) => api.get(`${BASE}/browse`, { params }),
  // alias untuk kompatibilitas
  getBrowseList: (params: any) => api.get(`${BASE}/browse`, { params }),

  getDetail: (nomor: string) => api.get(`${BASE}/detail/${encodeURIComponent(nomor)}`),
  getFormDetail: (nomor: string) => api.get(`${BASE}/form/${encodeURIComponent(nomor)}`),

  getCabang: () => api.get(`${BASE}/cabang`),
  getCabangOptions: () => api.get(`${BASE}/cabang`),
  getDivisi: () => api.get(`${BASE}/divisi`),
  getDivisiOptions: () => api.get(`${BASE}/divisi`),

  toggleClose: (nomor: string, isClose: boolean) => api.put(`${BASE}/${encodeURIComponent(nomor)}/close`, { isClose }),
  deleteData: (nomor: string) => api.delete(`${BASE}/${encodeURIComponent(nomor)}`),

  getPencapaian: (nomor: string) => api.get(`${BASE}/pencapaian/${encodeURIComponent(nomor)}`),
  savePencapaian: (nomor: string, payload: any) => api.post(`${BASE}/pencapaian/${encodeURIComponent(nomor)}`, payload),

  getUnnotifiedMap: () => api.get(`${BASE}/unnotified-map`),
  markMapNotified: (ids: any) => api.post(`${BASE}/mark-notified`, { ids }),

  createHeader: (payload: any) => api.post(`${BASE}/header`, payload),
  updateHeaderField: (nomor: string, field: string, value: any) => api.put(`${BASE}/header/${encodeURIComponent(nomor)}/field`, { field, value }),

  searchKandidatSo: (params: any) => api.get(`${BASE}/search/so`, { params }),
  searchSoKandidat: (params: any) => api.get(`${BASE}/search/so`, { params }),
  searchKandidatPraOrder: (params: any) => api.get(`${BASE}/search/praorder`, { params }),
  searchPraOrderKandidat: (params: any) => api.get(`${BASE}/search/praorder`, { params }),
  searchKandidatMap: (params: any) => api.get(`${BASE}/search/map`, { params }),
  searchMapKandidat: (params: any) => api.get(`${BASE}/search/map`, { params }),

  getSoInfo: (soNomor: string, divisi?: string, excludeNomor?: string) => api.get(`${BASE}/info/so`, { params: { soNomor, divisi, excludeNomor } }),
  getMapInfo: (params: any) => {
    const p = typeof params === "string" ? { mapNomor: params } : params;
    return api.get(`${BASE}/info/map`, { params: p });
  },
  getMhInfo: (mhNomor: string, divisi?: string, excludeNomor?: string) => api.get(`${BASE}/info/mh`, { params: { mhNomor, divisi, excludeNomor } }),
  getPenawaranDetailList: (penNomor: string) => api.get(`${BASE}/penawaran-detail`, { params: { penNomor } }),
  getPenawaranItemInfo: (params: any) => api.get(`${BASE}/penawaran-item`, { params }),

  addDetailRow: (pjwNomor: string, rowData: any) => api.post(`${BASE}/${encodeURIComponent(pjwNomor)}/detail`, rowData),
  updateDetailField: (pjwdId: number | string, field: string, value: any) => api.put(`${BASE}/detail/${pjwdId}/field`, { field, value }),
  deleteDetailRow: (pjwNomor: string, pjwdId: number | string) => {
    // overload: jika dipanggil dengan 2 param (header, id) atau 1 param (id)
    const id = pjwdId ?? pjwNomor;
    return api.delete(`${BASE}/detail/${id}`);
  },
  checkTargetPeriod: (pjwdId: string, tanggal: string) => api.get(`${BASE}/check-period`, { params: { pjwdId, tanggal } }),
  // Kontrak disamakan Manksi: (pjwNomor, pjwdId, tanggalBaru).
  // (Sebelumnya 2-param sehingga tanggal terbuang dan move selalu gagal.)
  moveDetailRow: (pjwNomor: string, pjwdId: number | string, tanggalBaru: string) => api.post(`${BASE}/detail/${pjwdId}/move`, { pjwNomor, tanggalBaru }),
  moveDetailRowToPeriod: (pjwNomor: string, pjwdId: number | string, tanggalBaru: string) => api.post(`${BASE}/detail/${pjwdId}/move`, { pjwNomor, tanggalBaru }),

  // alias
  getSoKandidat: (params: any) => api.get(`${BASE}/search/so`, { params }),
};

export default komitmenKirimService;


