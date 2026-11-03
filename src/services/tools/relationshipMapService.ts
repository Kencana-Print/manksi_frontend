import api from "@/services/api";

const BASE = "/tools/relationship-map";

export type NodeType =
  | "PRA_ORDER"
  | "KONFIRMASI_PRA_ORDER"
  | "PERMINTAAN_HARGA"
  | "PENAWARAN"
  | "MAP"
  | "SPK"
  | "SO"
  | "PROOF"
  | "SJ_MEMO"
  | "MPPB"
  | "PERMINTAAN_DESAIN"
  | "LHK_DESAIN"
  | "MKB"
  | "PO"
  | "BPB"
  | "QC_BAHAN"
  | "TINDAK_LANJUT_QC"
  | "BPB_NON_BAHAN"
  | "STBJ"
  | "SJ"
  | "INVOICE"
  | "VOUCHER"
  | "PLANNING_PPIC"
  | "PERMINTAAN_BAHAN"
  | "REALISASI_MINTA_BAHAN"
  | "RETUR_LOG"
  | "RETUR_BAHAN"
  | "MKA"
  | "PERMINTAAN_GARMEN"
  | "REALISASI_GARMEN"
  | "PERMINTAAN_PEMBELIAN"
  | "KASBON"
  | "PENGAJUAN_DANA"
  | "PENGAJUAN_UANG_MUKA"
  | "PENYELESAIAN_UANG_MUKA"
  | "BKK"
  | "BBK"
  | "KLAIM_KAS_KECIL"
  | "PENGAJUAN_TRANSFER"
  | "REALISASI_PENGAJUAN_TRANSFER"
  | "BKM"
  | "REKAP_PEMBAYARAN"
  | "MUTASI_OUT"
  | "PO_NON_BAHAN"
  | "MUTASI_PRODUKSI"
  | "PO_JASA"
  | "BPJ"
  | "PO_INTERNAL"
  | "SJ_PO_INTERNAL"
  | "JADWAL_KIRIM"
  | "SJ_TAK_NORMAL"
  | "INVOICE_TAK_NORMAL"
  | "PENERIMAAN_PIUTANG"
  | "PELUNASAN_PIUTANG"
  | "MAKLON"
  | "SJ_KELUAR_MAKLON"
  | "LHK_MAKLON"
  | "SJ_HASIL_MAKLON"
  | "TERIMA_MAKLON"
  | "COMPLAIN_CUSTOMER"
  | "BAP_PRODUKSI";

export interface PlanningDetailRow {
  spk: string;
  tglJadwal: string;
  wip: number;
  qtyPo: number;
  qtyJadwal: number;
  lineKelompok: string;
}

export interface DocNode {
  type: NodeType;
  nomor: string;
  tanggal?: string;
  label?: string;
  jumlah?: number;
  isProforma?: boolean; // khusus INVOICE, dari inv_sts_pro
  jenis?: number | string; // khusus PO, dari po_jenis (1=Greige, 2=Celup, else=Bahan) | number utk PO (po_jenis), string "KAS"/"BANK" utk KASBON
  hasBast?: boolean; // khusus MAP, dari mspk_bastnew
  jumlahJadi?: number; // khusus MAP, dari mspk_jumlah_jadi (cuma terisi kalau hasBast true)
  cabang?: string; // khusus PLANNING_PPIC
  planningDetail?: {
    cutting: PlanningDetailRow[];
    sewing: PlanningDetailRow[];
  };
  closeStatus?: number; // khusus PERMINTAAN_BAHAN
  isFromLog?: boolean; // khusus RETUR_BAHAN
  filteredBySpk?: string; // khusus PLANNING_PPIC, terisi kalau planningDetail difilter ke 1 SPK
  kategori?: string; // khusus PERMINTAAN_GARMEN & REALISASI_GARMEN: ACCESORIES/OBAT/SPAREPART/ATK-RTK | PERMINTAAN_GARMEN, REALISASI_GARMEN, PERMINTAAN_PEMBELIAN, MUTASI_OUT
  isSelesai?: boolean; // khusus KASBON
  jurNo?: string; // khusus KASBON
  cabangAsal?: string; // khusus MUTASI_OUT
  cabangTujuan?: string; // khusus MUTASI_OUT
  isDiterima?: boolean; // khusus MUTASI_OUT
  msiNomor?: string; // khusus MUTASI_OUT
  status?: string; // khusus PO_NON_BAHAN (po_status: ""/PROSES/CLOSE)
  gdgAsal?: string;
  gdgTujuan?: string;
  approveStatus?: string; // khusus SJ: "APPROVED" | "BATAL" (undefined = belum)
  statusPengiriman?: string; // khusus SJ: nama status dari tstatussj
  hasKuitansi?: boolean;
  noFakturPajak?: string;
  isExportedPpn?: boolean;
  locked?: boolean; // tipe ini tidak boleh dilihat user (hanya tipe + nomor)
  statusPpic?: string; // khusus KONFIRMASI_PRA_ORDER: PENDING/SANGGUP/TIDAK SANGGUP
  statusKlien?: string; // khusus PERMINTAAN_DESAIN: ACC/PENDING/CANCEL/CANCEL_ALT
  catatan?: string; // khusus KONFIRMASI_PRA_ORDER: catatan PPIC
  tglEstimasiSo?: string; // khusus KONFIRMASI_PRA_ORDER
  tglEstimasiMap?: string; // khusus KONFIRMASI_PRA_ORDER
  pumNomor?: string;
}

export interface ExpandResult {
  node: DocNode;
  backward: DocNode[];
  forward: DocNode[];
}

export const relationshipMapService = {
  expand: (type: NodeType, nomor: string) =>
    api.get<{ success: boolean; data: ExpandResult }>(`${BASE}/expand`, {
      params: { type, nomor },
    }),

  search: (type: NodeType | "", q: string) =>
    api.get<{ success: boolean; data: DocNode[] }>(`${BASE}/search`, {
      params: { type: type || undefined, q },
    }),

  types: () => api.get<{ success: boolean; data: NodeType[] }>(`${BASE}/types`),
};
