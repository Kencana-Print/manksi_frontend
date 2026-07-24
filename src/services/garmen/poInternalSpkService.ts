import api from "@/services/api";

export const poInternalSpkService = {
  getBrowse: (params: any) =>
    api.get("/garmen/po-internal-spk/po-internal", { params }),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/po-internal-spk/po-internal/detail/${encodeURIComponent(nomor)}`,
    ),

  checkModifiable: (nomor: string) =>
    api.get(
      `/garmen/po-internal-spk/po-internal/check-modifiable/${encodeURIComponent(nomor)}`,
    ),

  delete: (nomor: string) =>
    api.delete(
      `/garmen/po-internal-spk/po-internal/delete/${encodeURIComponent(nomor)}`,
    ),
};
