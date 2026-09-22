import api from "@/services/api";

const base = "/pembelian/uang-muka-penyelesaian";

export const uangMukaPenyelesaianFormService = {
  getFormData: (nomor: string) =>
    api.get(`${base}/${encodeURIComponent(nomor)}`).then((r) => r.data.data),
  getAccountOptions: (jenis: string, cabang: string) =>
    api
      .get(`${base}/account-options`, { params: { jenis, cabang } })
      .then((r) => r.data.data),
  getAllAccounts: () => api.get(`${base}/account-all`).then((r) => r.data.data),
  getAccountByKode: (kode: string) =>
    api
      .get(`${base}/account/${encodeURIComponent(kode)}`)
      .then((r) => r.data.data),
  getCostCenterOptions: () =>
    api.get(`${base}/cost-center-options`).then((r) => r.data.data),
  getDcOptions: (cckode: number | string) =>
    api
      .get(`${base}/dc-options`, { params: { cckode } })
      .then((r) => r.data.data),
  getSupplierOptions: (search = "") =>
    api
      .get(`${base}/supplier-options`, { params: { search } })
      .then((r) => r.data.data),
  getListPengajuanGA: (cabang: string) =>
    api
      .get(`${base}/pengajuan-ga`, { params: { cabang } })
      .then((r) => r.data.data),
  getDetailPengajuanGA: (pjhNomor: string) =>
    api
      .get(`${base}/pengajuan-ga/${encodeURIComponent(pjhNomor)}`)
      .then((r) => r.data.data),
  getListPoExternal: () =>
    api.get(`${base}/po-external`).then((r) => r.data.data),
  getListVoucher: () => api.get(`${base}/voucher`).then((r) => r.data.data),
  getListPermintaanGarmen: (cabang: string) =>
    api
      .get(`${base}/permintaan-garmen`, { params: { cabang } })
      .then((r) => r.data.data),
  getDetailPermintaanGarmen: (mbNomor: string) =>
    api
      .get(`${base}/permintaan-garmen/${encodeURIComponent(mbNomor)}`)
      .then((r) => r.data.data),
  getListInvoiceGarmen: () =>
    api.get(`${base}/invoice-garmen`).then((r) => r.data.data),
  getDetailInvoiceGarmen: (ivNomor: string) =>
    api
      .get(`${base}/invoice-garmen/${encodeURIComponent(ivNomor)}`)
      .then((r) => r.data.data),
  createSupplier: (data: any) => api.post(`${base}/supplier`, data),
  updateStatusFinance: (
    pmtNomor: string,
    nourut: number,
    status: string | null,
  ) => api.patch(`${base}/status-finance`, { pmtNomor, nourut, status }),
  save: (payload: any) =>
    api
      .post(`${base}/${encodeURIComponent(payload.nomor)}/save`, payload)
      .then((r) => r.data),
};
