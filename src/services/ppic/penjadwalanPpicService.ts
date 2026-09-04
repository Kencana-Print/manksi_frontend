import api from "@/services/api";

export const penjadwalanPpicService = {
  getBrowse(params: { startDate: string; endDate: string; cabang?: string }) {
    return api.get("/ppic/penjadwalan/browse", { params });
  },
  getDetail(nomor: string) {
    return api.get(`/ppic/penjadwalan/${nomor}/detail`);
  },
  toggleClose(nomor: string, isClose: boolean) {
    return api.put(`/ppic/penjadwalan/${nomor}/close`, { isClose });
  },
  deleteData(nomor: string) {
    return api.delete(`/ppic/penjadwalan/${nomor}`);
  },

  // ── Form ──
  getCabang() {
    return api.get("/ppic/penjadwalan-form/cabang");
  },
  getDivisi() {
    return api.get("/ppic/penjadwalan-form/divisi");
  },
  searchKandidatSo(
    startDate: string,
    endDate: string,
    divisi = "0",
    excludeNomor = "",
  ) {
    return api.get("/ppic/penjadwalan-form/kandidat-so", {
      params: { startDate, endDate, divisi, excludeNomor },
    });
  },
  searchKandidatPraOrder(
    startDate: string,
    endDate: string,
    divisi = "0",
    excludeNomor = "",
  ) {
    return api.get("/ppic/penjadwalan-form/kandidat-pra-order", {
      params: { startDate, endDate, divisi, excludeNomor },
    });
  },
  searchKandidatMap(
    startDate: string,
    endDate: string,
    divisi = "0",
    excludeNomor = "",
  ) {
    return api.get("/ppic/penjadwalan-form/kandidat-map", {
      params: { startDate, endDate, divisi, excludeNomor },
    });
  },
  getSoInfo(soNomor: string, divisi = "") {
    return api.get(`/ppic/penjadwalan-form/so-info/${soNomor}`, {
      params: { divisi },
    });
  },
  getMapInfo(mapNomor: string, divisi = "") {
    return api.get(`/ppic/penjadwalan-form/map-info/${mapNomor}`, {
      params: { divisi },
    });
  },
  getFormDetail(nomor: string) {
    return api.get(`/ppic/penjadwalan-form/${nomor}`);
  },
  save(payload: any) {
    return api.post("/ppic/penjadwalan-form/save", payload);
  },
  createHeader(payload: any) {
    return api.post("/ppic/penjadwalan-form/create", payload);
  },
  updateHeaderField(nomor: string, field: string, value: any) {
    return api.patch(`/ppic/penjadwalan-form/${nomor}/header`, {
      field,
      value,
    });
  },
  addDetailRow(pjwNomor: string, row: any) {
    return api.post("/ppic/penjadwalan-form/row", { pjwNomor, row });
  },
  updateDetailField(
    pjwNomor: string,
    pjwdId: number,
    field: string,
    value: any,
  ) {
    return api.patch(`/ppic/penjadwalan-form/row/${pjwdId}`, {
      pjwNomor,
      field,
      value,
    });
  },
  deleteDetailRow(pjwNomor: string, pjwdId: number) {
    return api.delete(`/ppic/penjadwalan-form/row/${pjwdId}`, {
      data: { pjwNomor },
    });
  },
  checkTargetPeriod(pjwdId: number, tanggalBaru: string) {
    return api.get(`/ppic/penjadwalan-form/row/${pjwdId}/check-target`, {
      params: { tanggalBaru },
    });
  },

  moveDetailRow(pjwNomor: string, pjwdId: number, tanggalBaru: string) {
    return api.post(`/ppic/penjadwalan-form/row/${pjwdId}/move`, {
      pjwNomor,
      tanggalBaru,
    });
  },
};
