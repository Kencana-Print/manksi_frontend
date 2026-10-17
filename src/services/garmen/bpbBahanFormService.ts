import api from "@/services/api";

export interface BpbBahanSavePayload {
  isEdit: boolean;
  header: Record<string, unknown>;
  items: Record<string, unknown>[];
  poItems: Record<string, unknown>[];
  barcodes: Record<string, unknown>[];
  statusNgedit: string;
  qcNomor?: string[];
  kodeDisetujui?: boolean;
}

export const bpbBahanFormService = {
  validateField: (type: string, value: string) =>
    api.get("/garmen/bahan-baku/bpb-bahan/form/validate", {
      params: { type, value },
    }),

  getDetail: (nomor: string) =>
    api.get(
      `/garmen/bahan-baku/bpb-bahan/form/detail/${encodeURIComponent(nomor)}`,
    ),

  saveData: (payload: BpbBahanSavePayload) =>
    api.post("/garmen/bahan-baku/bpb-bahan/form/save", payload),

  getMaxBarcode: (kode: string, tahun: string) =>
    api.get("/garmen/bahan-baku/bpb-bahan/form/max-barcode", {
      params: { kode, tahun },
    }),

  getQcSiap: (po = "") =>
    api.get("/garmen/bahan-baku/bpb-bahan/form/qc-siap", { params: { po } }),
};
