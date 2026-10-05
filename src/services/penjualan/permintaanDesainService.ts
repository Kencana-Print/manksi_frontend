import api from "@/services/api";

export const permintaanDesainService = {
  getBrowse: (filters: {
    startDate: string;
    endDate: string;
    status?: string;
    customer?: string;
    marketing?: string;
    jenisPekerjaan?: string;
  }) => api.get("/penjualan/permintaan-desain", { params: filters }),

  searchReferensi: (params: { q?: string; page?: number; limit?: number }) =>
    api.get("/penjualan/permintaan-desain/search", { params }),

  getDetail: (nomor: string) =>
    api.get(`/penjualan/permintaan-desain/${encodeURIComponent(nomor)}`),

  createPD: (payload: {
    tanggal: string;
    namaProject: string;
    customer?: string;
    jenisPekerjaan: string;
    dateline?: string;
    keterangan?: string;
    prioritas: string;
    desainer?: string;
    referensi?: string;
    items: { desain: string; jml: number }[];
  }) => api.post("/penjualan/permintaan-desain", payload),

  updateProgress: (nomor: string, jmlJadi: number) =>
    api.put(
      `/penjualan/permintaan-desain/${encodeURIComponent(nomor)}/progress`,
      { jmlJadi },
    ),

  updateDesainer: (nomor: string, desainer: string) =>
    api.put(
      `/penjualan/permintaan-desain/${encodeURIComponent(nomor)}/desainer`,
      { desainerKode: desainer },
    ),

  setStatusManual: (
    nomor: string,
    payload: { status: string; keterangan: string; referensi?: string },
  ) =>
    api.put(
      `/penjualan/permintaan-desain/${encodeURIComponent(nomor)}/status`,
      payload,
    ),

  resumeStatus: (nomor: string) =>
    api.put(`/penjualan/permintaan-desain/${encodeURIComponent(nomor)}/resume`),

  getLampiran: (nomor: string) =>
    api.get(
      `/penjualan/permintaan-desain/${encodeURIComponent(nomor)}/lampiran`,
    ),

  addLampiran: (nomor: string, files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return api.post(
      `/penjualan/permintaan-desain/${encodeURIComponent(nomor)}/lampiran`,
      fd,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },

  deleteLampiran: (id: number) =>
    api.delete(`/penjualan/permintaan-desain/lampiran/${id}`),

  getDesainerOptions: () =>
    api.get("/penjualan/permintaan-desain/desainer-options"),
};
