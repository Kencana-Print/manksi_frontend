// Tipe node & metadata khusus Relationship Map MMT
// (pengganti versi garmen yang belum ada di repo ini).

export type NodeType =
  | "MAP"
  | "SPK"
  | "SO"
  | "LHK_CETAK"
  | "LHK_TEKSTIL"
  | "LHK_PROOF"
  | "LHK_PAPERPRINT"
  | "LHK_SUBLIM"
  | "LHK_FINISHING"
  | "STBJ"
  | "JADWAL_KIRIM"
  | "SJ";

export interface DocNode {
  type: NodeType;
  nomor: string;
  label?: string;
  tanggal?: string;
  jumlah?: number;
  kategori?: string;
  approveStatus?: string;
  isProforma?: boolean;
  hasBast?: boolean;
  jumlahJadi?: number;
  isSelesai?: boolean;
  isDiterima?: boolean;
  cabangAsal?: string;
  cabangTujuan?: string;
  gdgAsal?: string;
  gdgTujuan?: string;
  statusPengiriman?: string;
  noFakturPajak?: string;
  hasKuitansi?: boolean;
  isExportedPpn?: boolean;
  [key: string]: any;
}

export const TYPE_META: Record<string, { label: string; color: string }> = {
  MAP: { label: "MAP", color: "#1565c0" },
  SPK: { label: "SPK", color: "#009688" },
  SO: { label: "SO", color: "#00acc1" },
  LHK_CETAK: { label: "LHK Cetak", color: "#7b1fa2" },
  LHK_TEKSTIL: { label: "LHK Tekstil", color: "#6a1b9a" },
  LHK_PROOF: { label: "LHK Proof", color: "#5e35b1" },
  LHK_PAPERPRINT: { label: "LHK Paperprint", color: "#4527a0" },
  LHK_SUBLIM: { label: "LHK Sublim", color: "#3949ab" },
  LHK_FINISHING: { label: "LHK Finishing", color: "#00838f" },
  STBJ: { label: "STBJ", color: "#ef6c00" },
  JADWAL_KIRIM: { label: "Jadwal Kirim", color: "#00695c" },
  SJ: { label: "Surat Jalan", color: "#37474f" },
};
