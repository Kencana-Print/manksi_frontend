import api from "@/services/api";

export const pengajuanDanaFormService = {
  searchNik: (
    query: string,
    lokasi: string | undefined,
    page: number,
    limit: number,
  ) =>
    api.get("/piutang/pengajuan-dana-form/nik-search", {
      params: { query, lokasi, page, limit },
    }),
  getNikInfo: (nik: string) =>
    api.get(`/piutang/pengajuan-dana-form/nik-info/${encodeURIComponent(nik)}`),
  getFormDetail: (nomor: string) =>
    api.get(`/piutang/pengajuan-dana-form/${encodeURIComponent(nomor)}`),
  create: (header: any, items: any[]) =>
    api.post("/piutang/pengajuan-dana-form", { header, items }),
  update: (nomor: string, header: any, items: any[]) =>
    api.put(`/piutang/pengajuan-dana-form/${encodeURIComponent(nomor)}`, {
      header,
      items,
    }),
  searchPermintaanPjh: (query: string, page: number, limit: number) =>
    api.get("/piutang/pengajuan-dana-form/permintaan-search", {
      params: { query, page, limit },
    }),
  getPermintaanDtl: (pmtNomor: string) =>
    api.get(
      `/piutang/pengajuan-dana-form/permintaan-dtl/${encodeURIComponent(pmtNomor)}`,
    ),
  searchJobButuh: (query: string, page: number, limit: number) =>
    api.get("/piutang/pengajuan-dana-form/jobbutuh-search", {
      params: { query, page, limit },
    }),
  getJobButuhDtl: (jbNomor: string) =>
    api.get(
      `/piutang/pengajuan-dana-form/jobbutuh-dtl/${encodeURIComponent(jbNomor)}`,
    ),
};
