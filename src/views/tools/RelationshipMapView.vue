<script setup lang="ts">
import {
  ref,
  computed,
  shallowRef,
  markRaw,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import {
  VueFlow,
  useVueFlow,
  Position,
  type Node,
  type Edge,
  type NodeMouseEvent,
} from "@vue-flow/core";
import { MiniMap } from "@vue-flow/minimap";
import { toPng } from "html-to-image";
import "@vue-flow/minimap/dist/style.css";
import { useRoute, useRouter } from "vue-router";
import { useTabsStore } from "@/stores/tabsStore";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import dagre from "dagre";
import { useToast } from "vue-toastification";
import {
  relationshipMapService,
  type NodeType,
  type DocNode,
} from "@/services/tools/relationshipMapService";
import DocNodeComponent from "@/components/relationship-map/DocNode.vue";
import { TYPE_META } from "@/constants/relationshipMapTypes";
import {
  IconSearch,
  IconRefresh,
  IconLock,
  IconCopy,
  IconDownload,
} from "@tabler/icons-vue";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";

const toast = useToast();
const { fitView, findNode, viewport, setViewport } = useVueFlow();

const nodeTypes = { docNode: markRaw(DocNodeComponent) };

const TYPE_OPTIONS: { value: NodeType | ""; title: string }[] = [
  { value: "", title: "Semua Tipe" },
  { value: "PRA_ORDER", title: "Pra Order" },
  { value: "KONFIRMASI_PRA_ORDER", title: "Konfirmasi Pra Order" },
  { value: "PERMINTAAN_HARGA", title: "Permintaan Harga" },
  { value: "PENAWARAN", title: "Penawaran" },
  { value: "MAP", title: "MAP" },
  { value: "SPK", title: "SPK" },
  { value: "SO", title: "SO" },
  { value: "PROOF", title: "Proof Garmen" },
  { value: "SJ_MEMO", title: "SJ Memo" },
  { value: "MPPB", title: "MPPB" },
  { value: "PERMINTAAN_DESAIN", title: "Permintaan Desain" },
  { value: "LHK_DESAIN", title: "LHK Desain" },
  { value: "MKB", title: "MKB" },
  { value: "PO", title: "PO" },
  { value: "BPB", title: "BPB" },
  { value: "QC_BAHAN", title: "QC Bahan" },
  { value: "TINDAK_LANJUT_QC", title: "Tindak Lanjut QC Bahan" },
  { value: "BPB_NON_BAHAN", title: "BPB Non Bahan" },
  { value: "STBJ", title: "STBJ" },
  { value: "SJ", title: "Surat Jalan" },
  { value: "INVOICE", title: "Invoice" },
  { value: "VOUCHER", title: "Voucher" },
  { value: "PLANNING_PPIC", title: "Planning PPIC" },
  { value: "PERMINTAAN_BAHAN", title: "Permintaan Bahan" },
  { value: "REALISASI_MINTA_BAHAN", title: "Realisasi Minta Bahan" },
  { value: "RETUR_LOG", title: "Retur Bahan (Log)" },
  { value: "RETUR_BAHAN", title: "Retur Bahan (Approved)" },
  { value: "MKA", title: "MKA (Aksesoris)" },
  { value: "PERMINTAAN_GARMEN", title: "Permintaan Barang Garmen" },
  { value: "REALISASI_GARMEN", title: "Realisasi Permintaan Garmen" },
  { value: "PERMINTAAN_PEMBELIAN", title: "Permintaan Pembelian" },
  { value: "KASBON", title: "Realisasi Uang Muka" },
  { value: "PENGAJUAN_DANA", title: "Pengajuan Dana" },
  { value: "PENGAJUAN_UANG_MUKA", title: "Pengajuan Uang Muka" },
  { value: "PENYELESAIAN_UANG_MUKA", title: "Penyelesaian Uang Muka" },
  { value: "BKK", title: "BKK" },
  { value: "BBK", title: "BBK" },
  { value: "KLAIM_KAS_KECIL", title: "Klaim Kas Kecil" },
  { value: "PENGAJUAN_TRANSFER", title: "Pengajuan Transfer" },
  {
    value: "REALISASI_PENGAJUAN_TRANSFER",
    title: "Realisasi Pengajuan Transfer",
  },
  { value: "BKM", title: "BKM" },
  { value: "REKAP_PEMBAYARAN", title: "Rekap Pembayaran" },
  { value: "MUTASI_OUT", title: "Mutasi Out Garmen" },
  { value: "PO_NON_BAHAN", title: "PO Non Bahan" },
  { value: "MUTASI_PRODUKSI", title: "Mutasi Produksi" },
  { value: "PO_JASA", title: "PO Jasa" },
  { value: "BPJ", title: "BPJ (Bon Pekerjaan Jasa)" },
  { value: "PO_INTERNAL", title: "PO Internal SPK" },
  { value: "SJ_PO_INTERNAL", title: "SJ PO Internal" },
  { value: "JADWAL_KIRIM", title: "Jadwal Kirim" },
  { value: "SJ_TAK_NORMAL", title: "Surat Jalan Tak Normal" },
  { value: "INVOICE_TAK_NORMAL", title: "Invoice Tak Normal" },
  { value: "PENERIMAAN_PIUTANG", title: "Penerimaan Piutang" },
  { value: "PELUNASAN_PIUTANG", title: "Pelunasan Piutang" },
  { value: "MAKLON", title: "Maklon Barang" },
  { value: "SJ_KELUAR_MAKLON", title: "SJ Keluar Maklon" },
  { value: "LHK_MAKLON", title: "LHK Maklon (DTF)" },
  { value: "SJ_HASIL_MAKLON", title: "SJ Hasil Maklon" },
  { value: "TERIMA_MAKLON", title: "Terima Hasil Maklon" },
  { value: "COMPLAIN_CUSTOMER", title: "Complain Customer" },
  { value: "BAP_PRODUKSI", title: "Berita Acara dan Komplain Produksi" },
];

// Tipe yang boleh dilihat user, dari backend (sumber tunggal pemetaan hak).
// null = belum dimuat / gagal: dropdown tampil lengkap, backend tetap menolak
// tipe yang tidak berhak.
const tipeBoleh = ref<Set<string> | null>(null);
const typeOptions = computed(() => {
  const boleh = tipeBoleh.value;
  return boleh
    ? TYPE_OPTIONS.filter((t) => t.value === "" || boleh.has(t.value))
    : TYPE_OPTIONS;
});
const TYPE_GROUPS: { label: string; types: NodeType[] }[] = [
  {
    label: "Marketing",
    types: [
      "PRA_ORDER",
      "PERMINTAAN_HARGA",
      "PENAWARAN",
      "MAP",
      "SO",
      "PERMINTAAN_DESAIN",
      "LHK_DESAIN",
      "PROOF",
      "COMPLAIN_CUSTOMER",
    ],
  },
  {
    label: "PPIC",
    types: [
      "KONFIRMASI_PRA_ORDER",
      "SPK",
      "MPPB",
      "PLANNING_PPIC",
      "JADWAL_KIRIM",
      "BAP_PRODUKSI",
    ],
  },
  {
    label: "Produksi & Gudang",
    types: [
      "MKB",
      "MKA",
      "PERMINTAAN_BAHAN",
      "REALISASI_MINTA_BAHAN",
      "RETUR_LOG",
      "RETUR_BAHAN",
      "PERMINTAAN_GARMEN",
      "REALISASI_GARMEN",
      "MUTASI_PRODUKSI",
      "MUTASI_OUT",
      "STBJ",
      "SJ_MEMO",
    ],
  },
  {
    label: "Pembelian",
    types: [
      "PERMINTAAN_PEMBELIAN",
      "PO",
      "PO_NON_BAHAN",
      "PO_JASA",
      "PO_INTERNAL",
      "SJ_PO_INTERNAL",
      "BPJ",
      "BPB",
      "BPB_NON_BAHAN",
      "QC_BAHAN",
      "TINDAK_LANJUT_QC",
    ],
  },
  {
    label: "Penjualan & Piutang",
    types: [
      "SJ",
      "SJ_TAK_NORMAL",
      "INVOICE",
      "INVOICE_TAK_NORMAL",
      "PENERIMAAN_PIUTANG",
      "PELUNASAN_PIUTANG",
    ],
  },
  {
    label: "Finance",
    types: [
      "PENGAJUAN_DANA",
      "PENGAJUAN_UANG_MUKA",
      "KASBON",
      "PENYELESAIAN_UANG_MUKA",
      "PENGAJUAN_TRANSFER",
      "REALISASI_PENGAJUAN_TRANSFER",
      "KLAIM_KAS_KECIL",
      "REKAP_PEMBAYARAN",
      "VOUCHER",
      "BKK",
      "BBK",
      "BKM",
    ],
  },
  {
    label: "Maklon",
    types: [
      "MAKLON",
      "SJ_KELUAR_MAKLON",
      "LHK_MAKLON",
      "SJ_HASIL_MAKLON",
      "TERIMA_MAKLON",
    ],
  },
];

const typeGroups = computed(() => {
  const titleOf = new Map(TYPE_OPTIONS.map((o) => [o.value, o.title]));
  const allowed = new Set(typeOptions.value.map((o) => o.value));
  const used = new Set<string>();
  const groups: {
    label: string;
    items: { value: NodeType | ""; title: string }[];
  }[] = [];

  TYPE_GROUPS.forEach((g) => {
    const items = g.types
      .filter((t) => allowed.has(t))
      .map((t) => {
        used.add(t);
        return { value: t, title: titleOf.get(t) ?? t };
      });
    if (items.length) groups.push({ label: g.label, items });
  });

  const rest = typeOptions.value
    .filter((o) => o.value !== "" && !used.has(o.value))
    .map((o) => ({ value: o.value, title: o.title }));
  if (rest.length) groups.push({ label: "Lainnya", items: rest });

  return groups;
});

onMounted(async () => {
  try {
    const res = await relationshipMapService.types();
    tipeBoleh.value = new Set(res.data.data);
  } catch {
    tipeBoleh.value = null;
  }
});

type RouteTarget =
  | { name: string; params: Record<string, string> }
  | { name: string; query: { nomor: string } };

// ⚠️ 6 tipe SENGAJA tidak dimasukkan (STBJ, SJ, INVOICE non-proforma,
// BPJ, VOUCHER, KASBON) karena route edit mereka di router.ts tidak
// punya param :nomor (kemungkinan pakai store/query state), atau
// (VOUCHER/KASBON) hidup di app Finance ERP terpisah — bukan di
// router MANKSI ini. Jangan ditambah sampai ada konfirmasi cara
// deep-link yang benar untuk keenamnya.
const NODE_ROUTE_MAP: Partial<
  Record<NodeType, (n: DocNode) => RouteTarget | null>
> = {
  PRA_ORDER: (n) => ({ name: "PraOrderEdit", params: { nomor: n.nomor } }),
  PERMINTAAN_HARGA: (n) => ({
    name: "PermintaanHargaEdit",
    params: { nomor: n.nomor },
  }),
  PENAWARAN: (n) => ({ name: "PenawaranFormEdit", params: { nomor: n.nomor } }),
  MPPB: (n) => ({ name: "MppbFormEdit", params: { nomor: n.nomor } }),
  PERMINTAAN_DESAIN: (n) => ({
    name: "PermintaanDesainEdit",
    params: { nomor: n.nomor },
  }),
  MAP: (n) => ({ name: "MapFormEdit", params: { nomor: n.nomor } }),
  SPK: (n) => ({ name: "PpicSpkEdit", params: { nomor: n.nomor } }),
  SO: (n) => ({ name: "SalesOrderEdit", params: { nomor: n.nomor } }),
  PROOF: (n) => ({ name: "ProofEdit", params: { nomor: n.nomor } }),
  SJ_MEMO: (n) => ({ name: "SjMapEdit", params: { nomor: n.nomor } }),
  MKB: (n) => ({ name: "MkbFormEdit", params: { nomor: n.nomor } }),
  PO: (n) => ({ name: "PoBahanEdit", params: { nomor: n.nomor } }),
  BPB: (n) => ({ name: "BpbBahanEdit", params: { nomor: n.nomor } }),
  BPB_NON_BAHAN: (n) => ({
    name: "BpbNonBahanGarmenFormEdit",
    params: { nomor: n.nomor },
  }),
  INVOICE: (n) =>
    n.isProforma
      ? { name: "InvoiceProformaEdit", params: { nomor: n.nomor } }
      : { name: "InvoiceFormEdit", params: { nomor: n.nomor } },
  PLANNING_PPIC: (n) => ({
    name: "PpicPlanningSpkEdit",
    params: { nomor: n.nomor },
  }),
  PERMINTAAN_BAHAN: (n) => ({
    name: "GarmenMintaBahanEdit",
    params: { nomor: n.nomor },
  }),
  REALISASI_MINTA_BAHAN: (n) => ({
    name: "GarmenRealisasiBahanEdit",
    params: { nomor: n.nomor },
  }),
  RETUR_LOG: (n) => ({
    name: "GarmenReturBahanEdit",
    params: { nomor: n.nomor },
  }),
  // RETUR_BAHAN (RETP) diarahkan ke form Approve, karena getDetailApprove
  // di backend menangani baik RETL maupun RETP by prefix nomor
  RETUR_BAHAN: (n) => ({
    name: "GarmenApproveReturBahanForm",
    params: { nomor: n.nomor },
  }),
  MKA: (n) => ({ name: "GarmenMkaEdit", params: { nomor: n.nomor } }),
  PERMINTAAN_GARMEN: (n) => ({
    name: "GarmenPermintaanBarangEdit",
    params: { nomor: n.nomor },
  }),
  REALISASI_GARMEN: (n) => ({
    name: "GarmenRealisasiBarangEdit",
    params: { nomor: n.nomor },
  }),
  PERMINTAAN_PEMBELIAN: (n) => ({
    name: "PermintaanPembelianFormEdit",
    params: { nomor: n.nomor },
  }),
  MUTASI_OUT: (n) => ({
    name: "MutasiOutGarmenFormEdit",
    params: { nomor: n.nomor },
  }),
  PO_NON_BAHAN: (n) => ({
    name: "PoNonBahanGarmenFormEdit",
    params: { nomor: n.nomor },
  }),
  QC_BAHAN: (n) => ({ name: "QcBahanEdit", params: { nomor: n.nomor } }),
  MUTASI_PRODUKSI: (n) => ({
    name: "MutasiProduksiEdit",
    params: { nomor: n.nomor },
  }),
  PO_JASA: (n) => ({ name: "PoJasaFormEdit", params: { nomor: n.nomor } }),
  PO_INTERNAL: (n) => ({
    name: "PoInternalSpkEdit",
    params: { nomor: n.nomor },
  }),
  SJ_PO_INTERNAL: (n) => ({
    name: "SjPoInternalSpkEdit",
    params: { nomor: n.nomor },
  }),
  JADWAL_KIRIM: (n) => ({
    name: "JadwalKirimEdit",
    params: { nomor: n.nomor },
  }),
  PENERIMAAN_PIUTANG: (n) => {
    const routeByKategori: Record<string, string> = {
      CS: "PenerimaanCashEdit",
      BT: "PenerimaanTransferEdit",
      PT: "PenerimaanPotonganEdit",
      BG: "PenerimaanGiroEdit",
    };
    const routeName = routeByKategori[n.kategori || ""];
    return routeName ? { name: routeName, params: { nomor: n.nomor } } : null;
  },
  PELUNASAN_PIUTANG: (n) => ({
    name: "PelunasanPiutangEdit",
    params: { nomor: n.nomor },
  }),
  STBJ: (n) => ({ name: "StbjFormEdit", params: { nomor: n.nomor } }),
  SJ: (n) => ({ name: "SuratJalanFormEdit", params: { nomor: n.nomor } }),

  BPJ: (n) => ({ name: "BpbJasaFormEdit", params: { nomor: n.nomor } }),
  SJ_TAK_NORMAL: (n) => ({
    name: "SjTakNormalFormEdit",
    params: { nomor: n.nomor },
  }),
  INVOICE_TAK_NORMAL: (n) => ({
    name: "InvoiceTakNormalFormEdit",
    params: { nomor: n.nomor },
  }),
  VOUCHER: (n) => ({
    name: "VoucherPembayaranEdit",
    params: { nomor: n.nomor },
  }),
  PENGAJUAN_DANA: (n) => ({
    name: "PengajuanDanaEdit",
    params: { nomor: n.nomor },
  }),
  PENGAJUAN_UANG_MUKA: (n) => ({
    name: "PengajuanUangMukaPrint",
    params: { nomor: n.nomor },
  }),
  KASBON: (n) =>
    n.pumNomor
      ? { name: "UangMukaPrint", params: { nomor: n.pumNomor } }
      : null,
  PENYELESAIAN_UANG_MUKA: (n) => ({
    name: "UangMukaPenyelesaianForm",
    params: { nomor: n.nomor },
  }),
  BKK: (n) => ({ name: "BkkEdit", params: { nomor: n.nomor } }),
  BBK: (n) => ({ name: "BbkEdit", params: { nomor: n.nomor } }),
  KLAIM_KAS_KECIL: (n) => ({
    name: "KlaimKasKecilEdit",
    params: { nomor: n.nomor },
  }),
  PENGAJUAN_TRANSFER: (n) => ({
    name: "PengajuanTransferEdit",
    params: { nomor: n.nomor },
  }),
  REALISASI_PENGAJUAN_TRANSFER: (n) => ({
    name: "PengajuanTransferRealisasi",
    params: { nomor: n.nomor },
  }),
  BKM: (n) => ({ name: "BkmEdit", params: { nomor: n.nomor } }),
  REKAP_PEMBAYARAN: (n) => ({
    name: "RekapPembayaranEdit",
    params: { nomor: n.nomor },
  }),
  MAKLON: (n) => ({ name: "MaklonBarangEdit", params: { nomor: n.nomor } }),
  SJ_KELUAR_MAKLON: (n) => ({
    name: "MaklonSjKeluarPrint",
    params: { sjkNomor: n.nomor },
  }),
  SJ_HASIL_MAKLON: (n) => ({
    name: "SjHasilMakloonPrint",
    params: { nomor: n.nomor },
  }),
  COMPLAIN_CUSTOMER: (n) => ({
    name: "ComplainCustomerEdit",
    params: { nomor: n.nomor },
  }),
  BAP_PRODUKSI: (n) => ({
    name: "BapProduksiEdit",
    params: { nomor: n.nomor },
  }),
};

const getDetailRoute = (node: DocNode): RouteTarget | null => {
  const fn = NODE_ROUTE_MAP[node.type];
  if (!fn) return null;
  const route = fn(node);
  return route || null;
};

const route = useRoute();
const router = useRouter();
const tabsStore = useTabsStore();
const MAP_PATH = "/tools/relationship-map";

// Halaman ber-layout DefaultLayout dibuka sebagai tab (router.afterEach yang
// membuat tab-nya); halaman cetak/blank tetap jendela browser baru.
const openDetail = (node: DocNode) => {
  const target = getDetailRoute(node);
  if (!target) return;
  const resolved = router.resolve(target);
  if (resolved.meta.layout === "DefaultLayout") {
    router.push(target);
  } else {
    window.open(resolved.href, "_blank");
  }
};

const searchType = ref<NodeType | "">("");
const searchQuery = ref("");
const searchResults = ref<DocNode[]>([]);
const showSearchResults = ref(false);
const isSearching = ref(false);
const searchError = ref(false);

const MIN_SEARCH_CHARS = 2;

const typeLabel = (t: NodeType): string => (TYPE_META[t] || {}).label || t;
const typeColor = (t: NodeType): string =>
  (TYPE_META[t] || {}).color || "#1565c0";

let searchDebounce: ReturnType<typeof setTimeout> | null = null;
// Naik setiap ada pencarian baru / dibatalkan; respons dengan nomor lama dibuang.
let searchSeq = 0;

const onSearchInput = () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  const q = searchQuery.value.trim();
  if (q.length < MIN_SEARCH_CHARS) {
    searchSeq++;
    searchResults.value = [];
    searchError.value = false;
    isSearching.value = false;
    showSearchResults.value = false;
    return;
  }
  searchDebounce = setTimeout(async () => {
    const seq = ++searchSeq;
    const type = searchType.value;
    isSearching.value = true;
    searchError.value = false;
    showSearchResults.value = true;
    try {
      const res = await relationshipMapService.search(type, q);
      if (seq !== searchSeq) return;
      searchResults.value = res.data.data || [];
    } catch {
      if (seq !== searchSeq) return;
      searchResults.value = [];
      searchError.value = true;
    } finally {
      if (seq === searchSeq) isSearching.value = false;
    }
  }, 300);
};

// ── Graph state ──
const nodes = shallowRef<Node[]>([]);
const edges = shallowRef<Edge[]>([]);
const expandedIds = ref<Set<string>>(new Set());
const centerNodeId = ref<string | null>(null);

const selectedNode = ref<DocNode | null>(null);
const hoverId = ref<string | null>(null);
const isExporting = ref(false);

const isDummyEdge = (e: Edge): boolean =>
  (e.data as { isDummy?: boolean } | undefined)?.isDummy === true;

// Catatan node/edge yang BARU muncul dari expand suatu node; dipakai collapse
// supaya hanya membuang yang memang berasal dari expand itu.
const expansionLog = new Map<string, { nodes: string[]; edges: string[] }>();

const snapshotGraph = () => ({
  nodes: new Set(nodes.value.map((n) => n.id)),
  edges: new Set(edges.value.map((e) => e.id)),
});

const recordExpansion = (
  id: string,
  before: ReturnType<typeof snapshotGraph>,
) => {
  expansionLog.set(id, {
    nodes: nodes.value.map((n) => n.id).filter((nid) => !before.nodes.has(nid)),
    edges: edges.value.map((e) => e.id).filter((eid) => !before.edges.has(eid)),
  });
};

// Jumlah request (expand / startFrom) yang sedang jalan; overlay tampil selama > 0.
const loadingCount = ref(0);
const isLoading = computed(() => loadingCount.value > 0);

// Naik setiap graf dimulai ulang / di-reset; respons lama yang telat dibuang.
let graphEpoch = 0;
// Node yang request expand-nya sedang jalan, supaya klik ganda tidak mengirim 2 request.
const expandingIds = new Set<string>();
// Node yang sedang di-expand; dipakai DocNode untuk menampilkan spinner di tombolnya.
const busyIds = ref<Set<string>>(new Set());

const nodeId = (n: DocNode) => `${n.type}:${n.nomor}`;

const errMsg = (e: unknown, fallback: string): string => {
  const msg = (e as { response?: { data?: { message?: string } } })?.response
    ?.data?.message;
  return msg || fallback;
};

const NODE_W = 170;
const NODE_H = 90;

// Ukuran nyata kartu (diukur Vue Flow setelah render); fallback bila belum terukur.
const nodeSize = (id: string) => {
  const d = findNode(id)?.dimensions;
  return { width: d?.width || NODE_W, height: d?.height || NODE_H };
};

// anchorId: node yang posisinya dipertahankan (tidak bergeser) setelah layout.
const runLayout = (anchorId?: string) => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.value.forEach((n) => g.setNode(n.id, nodeSize(n.id)));
  edges.value.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  let dx = 0;
  let dy = 0;
  if (anchorId) {
    const old = nodes.value.find((n) => n.id === anchorId)?.position;
    const pos = g.node(anchorId);
    if (old && pos) {
      const s = nodeSize(anchorId);
      dx = old.x - (pos.x - s.width / 2);
      dy = old.y - (pos.y - s.height / 2);
    }
  }

  nodes.value = nodes.value.map((n) => {
    const pos = g.node(n.id);
    const s = nodeSize(n.id);
    return {
      ...n,
      position: { x: pos.x - s.width / 2 + dx, y: pos.y - s.height / 2 + dy },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
  });
};

// Layout 2 tahap: tahap 1 pakai ukuran fallback, tahap 2 setelah kartu
// terukur (ukuran nyata). Node anchor tetap di tempatnya; fitView hanya
// bila fit = true (saat mulai dari dokumen baru).
const applyLayout = (anchorId?: string, fit = false) => {
  runLayout(anchorId);
  nextTick(() => {
    setTimeout(() => {
      runLayout(anchorId);
      if (fit) fitView({ padding: 0.2, duration: 300 });
    }, 60);
  });
};

const addNode = (docNode: DocNode, isCenter = false) => {
  const id = nodeId(docNode);
  const existing = nodes.value.find((n) => n.id === id);
  if (existing) return id;

  nodes.value = [
    ...nodes.value,
    {
      id,
      type: "docNode",
      position: { x: 0, y: 0 },
      data: { ...docNode, isCenter, expanded: false },
    },
  ];
  return id;
};

const addEdge = (sourceId: string, targetId: string, isDummy = false) => {
  const id = `${sourceId}->${targetId}${isDummy ? ":order" : ""}`;
  if (edges.value.some((e) => e.id === id)) return;
  edges.value = [
    ...edges.value,
    isDummy
      ? {
          id,
          source: sourceId,
          target: targetId,
          animated: false,
          // Edge semu, murni buat bantu dagre nge-rank horizontal
          // sesuai urutan proses produksi — TIDAK merepresentasikan
          // relasi struktural di database. Dibedakan visual (putus-
          // putus, samar, tanpa panah) supaya tidak disalahartikan
          // sebagai edge asli.
          style: { stroke: "#d0d5db", strokeWidth: 1, strokeDasharray: "3,4" },
          data: { isDummy: true },
        }
      : {
          id,
          source: sourceId,
          target: targetId,
          animated: false,
          style: { stroke: "#90a4ae", strokeWidth: 1.5 },
          markerEnd: { type: "arrowclosed", color: "#90a4ae" } as any,
        },
  ];
};

// Tambah edge semu berurutan antar node BERTIPE TERTENTU yang muncul
// dalam satu batch forward yang sama, supaya dagre nge-rank mereka
// horizontal sesuai urutan alur bisnis (bukan numpuk di kolom yang
// sama karena jarak graf-nya kebetulan sama). Cuma dijalankan atas
// node-node yang baru saja ditambahkan dalam expand ini.
const chainNodesByType = (allNodeIds: string[], typeOrder: string[]) => {
  // Ambil 1 node per tipe (yang pertama ketemu), sesuai urutan typeOrder
  const chainIds: string[] = [];
  for (const t of typeOrder) {
    const id = allNodeIds.find((nid) => nid.startsWith(`${t}:`));
    if (id) chainIds.push(id);
  }
  for (let i = 0; i < chainIds.length - 1; i++) {
    addEdge(chainIds[i], chainIds[i + 1], true);
  }
};

const chainMutasiProduksiOrder = (forwardNodeIds: string[]) => {
  const mpIds = forwardNodeIds.filter((id) =>
    id.startsWith("MUTASI_PRODUKSI:"),
  );
  for (let i = 0; i < mpIds.length - 1; i++) {
    addEdge(mpIds[i], mpIds[i + 1], true);
  }
};

// Rantai pengiriman: STBJ -> Jadwal Kirim -> SJ -> Invoice. Node2 ini
// TIDAK saling ber-FK di database (masing2 backward independen ke
// SPK/turunan), tapi secara alur bisnis urutannya jelas — dummy edge
// ini murni bantu dagre nge-rank mereka horizontal ke kanan sesuai
// kronologi, BUKAN merepresentasikan relasi struktural.
const chainPengirimanOrder = (allNodeIds: string[]) => {
  chainNodesByType(allNodeIds, ["STBJ", "JADWAL_KIRIM", "SJ", "INVOICE"]);
};

// Kasbon (uang muka) & Mutasi Out sama-sama forward children dari
// Permintaan Pembelian, TAPI TIDAK ada FK langsung satu sama lain —
// bond2_mso di tkasbonitem2 cuma flag 'Y'/'N' (char(1)), bukan
// referensi nomor dokumen, dan tgarmenmso_hdr/tgarmenmso_dtl sama
// sekali tidak punya kolom penunjuk ke Kasbon. Dummy edge di sini
// MURNI urutan baca alur bisnis (uang muka cair dulu, baru barang
// di-mutasi out) — sama prinsipnya dengan chainPengirimanOrder,
// BUKAN relasi struktural di database.
const chainKasbonMutasiOrder = (allNodeIds: string[]) => {
  chainNodesByType(allNodeIds, ["KASBON", "MUTASI_OUT"]);
};

// BBK -> BKM pada Realisasi Pengajuan Transfer: tidak ada FK (BKM otomatis
// hanya bernomor NN + nomor PJT), garis semu murni agar BKM digambar sesudah BBK.
const chainBbkBkmOrder = (allNodeIds: string[]) => {
  chainNodesByType(allNodeIds, ["BBK", "BKM"]);
};

// SJ Keluar -> LHK pada Maklon: LHK tidak menyimpan SJ Keluar (hanya mkl_nomor),
// jadi garis semu ini murni agar LHK digambar sesudah SJ Keluar.
const chainMaklonOrder = (allNodeIds: string[]) => {
  chainNodesByType(allNodeIds, ["SJ_KELUAR_MAKLON", "LHK_MAKLON"]);
};

const markExpanded = (id: string) => {
  expandedIds.value.add(id);
  const log = expansionLog.get(id);
  const collapsible =
    !!log && (log.edges.length > 0 || log.nodes.some((n) => n !== id));
  nodes.value = nodes.value.map((n) =>
    n.id === id
      ? { ...n, data: { ...n.data, expanded: true, collapsible } }
      : n,
  );
};

const expandNode = async ({
  type,
  nomor,
}: {
  type: NodeType;
  nomor: string;
}) => {
  const id = `${type}:${nomor}`;
  if (expandedIds.value.has(id) || expandingIds.has(id)) return;

  const epoch = graphEpoch;
  expandingIds.add(id);
  busyIds.value.add(id);
  try {
    const res = await relationshipMapService.expand(type, nomor);
    if (epoch !== graphEpoch) return;
    const { backward, forward } = res.data.data;

    const before = snapshotGraph();
    backward.forEach((b) => {
      const bId = addNode(b);
      addEdge(bId, id);
    });

    const forwardIds: string[] = [];
    forward.forEach((f) => {
      const fId = addNode(f);
      addEdge(id, fId);
      forwardIds.push(fId);
    });
    recordExpansion(id, before);

    chainMutasiProduksiOrder(forwardIds);
    chainPengirimanOrder(nodes.value.map((n) => n.id));
    chainKasbonMutasiOrder(nodes.value.map((n) => n.id));
    chainBbkBkmOrder(nodes.value.map((n) => n.id));
    chainMaklonOrder(nodes.value.map((n) => n.id));
    markExpanded(id);
    applyLayout(id);
  } catch (e: unknown) {
    if (epoch !== graphEpoch) return;
    toast.error(errMsg(e, "Gagal memuat relasi."));
  } finally {
    expandingIds.delete(id);
    busyIds.value.delete(id);
  }
};

// Lipat turunan: buang node/edge yang muncul dari expand `rootId` (termasuk
// expand turunannya), kecuali node yang masih terhubung ke cabang lain.
const collapseNode = (rootId: string) => {
  if (expandingIds.size) {
    toast.info("Tunggu proses expand selesai dulu.");
    return;
  }
  let ns = nodes.value;
  let es = edges.value;
  const folded = new Set<string>();

  const fold = (nid: string) => {
    const log = expansionLog.get(nid);
    if (!log) return;

    // Turunan yang pernah di-expand dilipat dulu (dari yang terdalam).
    log.nodes.forEach((childId) => {
      if (childId !== nid && expandedIds.value.has(childId)) fold(childId);
    });

    const dropEdges = new Set(log.edges);
    es = es.filter((e) => !dropEdges.has(e.id));

    const linked = new Set<string>();
    es.forEach((e) => {
      if (isDummyEdge(e)) return;
      linked.add(e.source);
      linked.add(e.target);
    });
    const dropNodes = new Set(
      log.nodes.filter(
        (n) => n !== nid && n !== centerNodeId.value && !linked.has(n),
      ),
    );
    ns = ns.filter((n) => !dropNodes.has(n.id));
    es = es.filter((e) => !dropNodes.has(e.source) && !dropNodes.has(e.target));
    dropNodes.forEach((n) => {
      expandedIds.value.delete(n);
      expansionLog.delete(n);
      folded.delete(n);
    });

    expandedIds.value.delete(nid);
    expansionLog.delete(nid);
    folded.add(nid);
  };

  fold(rootId);
  if (!folded.size) return;

  const alive = new Set(ns.map((n) => n.id));
  nodes.value = ns.map((n) =>
    folded.has(n.id)
      ? { ...n, data: { ...n.data, expanded: false, collapsible: false } }
      : n,
  );
  edges.value = es;
  if (selectedNode.value && !alive.has(nodeId(selectedNode.value))) {
    selectedNode.value = null;
  }
  hoverId.value = null;
  applyLayout(rootId);
};

const startFrom = async (doc: DocNode) => {
  // Batalkan pencarian yang masih berjalan agar dropdown tidak terbuka lagi.
  if (searchDebounce) clearTimeout(searchDebounce);
  searchSeq++;
  isSearching.value = false;
  showSearchResults.value = false;
  searchQuery.value = `${typeLabel(doc.type)}: ${doc.nomor}`;

  const epoch = ++graphEpoch;
  expandingIds.clear();
  busyIds.value = new Set();
  expansionLog.clear();
  selectedNode.value = null;
  hoverId.value = null;
  hiddenTypes.value = new Set();
  nodes.value = [];
  edges.value = [];
  expandedIds.value = new Set();

  loadingCount.value++;
  try {
    const res = await relationshipMapService.expand(doc.type, doc.nomor);
    if (epoch !== graphEpoch) return;
    const { node, backward, forward } = res.data.data;

    const before = snapshotGraph();
    const centerId = addNode(node, true);
    centerNodeId.value = centerId;

    backward.forEach((b) => {
      const bId = addNode(b);
      addEdge(bId, centerId);
    });

    const forwardIds: string[] = [];
    forward.forEach((f) => {
      const fId = addNode(f);
      addEdge(centerId, fId);
      forwardIds.push(fId);
    });
    recordExpansion(centerId, before);

    chainMutasiProduksiOrder(forwardIds);
    chainPengirimanOrder(nodes.value.map((n) => n.id));
    chainKasbonMutasiOrder(nodes.value.map((n) => n.id));
    chainBbkBkmOrder(nodes.value.map((n) => n.id));
    chainMaklonOrder(nodes.value.map((n) => n.id));
    markExpanded(centerId);
    applyLayout(undefined, true);
    syncUrl(doc.type, doc.nomor);
  } catch (e: unknown) {
    if (epoch !== graphEpoch) return;
    toast.error(errMsg(e, "Gagal memuat data."));
  } finally {
    loadingCount.value--;
  }
};

const onNodeExpand = (payload: { type: string; nomor: string }) => {
  expandNode(payload as { type: NodeType; nomor: string });
};

const onNodeCollapse = (payload: { type: string; nomor: string }) => {
  collapseNode(`${payload.type}:${payload.nomor}`);
};

const resetGraph = () => {
  graphEpoch++;
  searchSeq++;
  expandingIds.clear();
  busyIds.value = new Set();
  expansionLog.clear();
  nodes.value = [];
  edges.value = [];
  expandedIds.value = new Set();
  centerNodeId.value = null;
  selectedNode.value = null;
  hoverId.value = null;
  hiddenTypes.value = new Set();
  searchQuery.value = "";
  syncUrl();
};

const hasGraph = computed(() => nodes.value.length > 0);

const isValidType = (t: string): t is NodeType =>
  TYPE_OPTIONS.some((o) => o.value !== "" && o.value === t);

// Tautan dalam: /tools/relationship-map?type=SPK&nomor=XXXX
const startFromQuery = () => {
  if (route.name !== "ToolsRelationshipMap") return;
  const type = route.query.type;
  const nomor = route.query.nomor;
  if (typeof type !== "string" || typeof nomor !== "string") return;
  const n = nomor.trim();
  if (!n) return;
  if (!isValidType(type)) {
    toast.error("Tipe dokumen pada tautan tidak dikenali.");
    return;
  }
  if (centerNodeId.value === `${type}:${n}`) return;
  startFrom({ type, nomor: n } as DocNode);
};

// Selaraskan query di route DAN di tab-nya: TabView memakai tab.query untuk
// menavigasi saat user kembali ke tab ini, jadi harus sama dengan graf yang tampil.
const syncUrl = (type?: NodeType, nomor?: string) => {
  const query: Record<string, string> = type && nomor ? { type, nomor } : {};
  tabsStore.updateTabQuery(MAP_PATH, type && nomor ? query : undefined);
  // Bila user sedang di tab lain (respons telat), jangan ubah route halaman itu.
  if (route.name !== "ToolsRelationshipMap") return;
  router.replace({ path: MAP_PATH, query }).catch(() => {});
};
const pageUrl = () => window.location.href;

const onViewDetail = (docNode: DocNode) => {
  selectedNode.value = docNode;
};

// ── Sorot jalur (hulu + hilir dari node yang di-hover / dipilih) ──
const focusId = computed(() =>
  isExporting.value
    ? null
    : (hoverId.value ??
      (selectedNode.value ? nodeId(selectedNode.value) : null)),
);

const lineage = computed<Set<string> | null>(() => {
  const start = focusId.value;
  if (!start) return null;

  const up = new Map<string, string[]>();
  const down = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, k: string, v: string) => {
    const a = m.get(k);
    if (a) a.push(v);
    else m.set(k, [v]);
  };
  edges.value.forEach((e) => {
    if (isDummyEdge(e)) return;
    push(down, e.source, e.target);
    push(up, e.target, e.source);
  });

  const acc = new Set<string>([start]);
  const walk = (m: Map<string, string[]>) => {
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop() as string;
      for (const nx of m.get(cur) ?? []) {
        if (!acc.has(nx)) {
          acc.add(nx);
          stack.push(nx);
        }
      }
    }
  };
  walk(up);
  walk(down);
  return acc;
});

const hiddenTypes = ref<Set<NodeType>>(new Set());
const toggleType = (t: NodeType) => {
  if (hiddenTypes.value.has(t)) hiddenTypes.value.delete(t);
  else hiddenTypes.value.add(t);
};
const showAllTypes = () => hiddenTypes.value.clear();

const displayNodes = computed<Node[]>(() => {
  if (!hiddenTypes.value.size) return nodes.value;
  return nodes.value.map((n) =>
    hiddenTypes.value.has((n.data as DocNode).type)
      ? { ...n, hidden: true }
      : n,
  );
});

const hiddenNodeIds = computed(() => {
  const out = new Set<string>();
  if (!hiddenTypes.value.size) return out;
  nodes.value.forEach((n) => {
    if (hiddenTypes.value.has((n.data as DocNode).type)) out.add(n.id);
  });
  return out;
});

const isDimmed = (id: string): boolean => {
  const s = lineage.value;
  return s !== null && !s.has(id);
};

const displayEdges = computed<Edge[]>(() => {
  const s = lineage.value;
  const hid = hiddenNodeIds.value;
  if (!s && !hid.size) return edges.value;
  return edges.value.map((e) => {
    if (hid.has(e.source) || hid.has(e.target)) return { ...e, hidden: true };
    if (s && (isDummyEdge(e) || !s.has(e.source) || !s.has(e.target))) {
      return { ...e, class: "edge-dim" };
    }
    return e;
  });
});

const onNodeMouseEnter = ({ node }: NodeMouseEvent) => {
  hoverId.value = node.id;
};
const onNodeMouseLeave = () => {
  hoverId.value = null;
};

// ── Legenda ──
const legendOpen = ref(true);
const legendTypes = computed(() => {
  const seen = new Set<NodeType>();
  const out: { type: NodeType; label: string; color: string }[] = [];
  nodes.value.forEach((n) => {
    const t = (n.data as DocNode).type;
    if (seen.has(t)) return;
    seen.add(t);
    out.push({ type: t, label: typeLabel(t), color: typeColor(t) });
  });
  return out;
});
const hasDummyEdge = computed(() => edges.value.some(isDummyEdge));
const hasLocked = computed(() =>
  nodes.value.some((n) => (n.data as DocNode).locked === true),
);

// ── Panel detail ──
const canRecenter = computed(
  () =>
    !!selectedNode.value &&
    !selectedNode.value.locked &&
    nodeId(selectedNode.value) !== centerNodeId.value,
);

const startFromSelected = () => {
  const doc = selectedNode.value;
  if (doc) startFrom(doc);
};

const copyText = async (text: string, okMsg: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback untuk akses http (non-HTTPS) di jaringan lokal.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (!ok) throw new Error("copy gagal");
    }
    toast.success(okMsg);
  } catch {
    toast.error("Gagal menyalin.");
  }
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== "Escape") return;
  if (showSearchResults.value) {
    showSearchResults.value = false;
    return;
  }
  if (selectedNode.value) selectedNode.value = null;
};
onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
const activeIdx = ref(-1);
watch(searchResults, () => {
  activeIdx.value = -1;
});

const onSearchKeydown = (e: KeyboardEvent) => {
  const len = searchResults.value.length;
  if (!showSearchResults.value || isSearching.value || !len) return;

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const step = e.key === "ArrowDown" ? 1 : -1;
    activeIdx.value =
      activeIdx.value < 0
        ? step === 1
          ? 0
          : len - 1
        : (activeIdx.value + step + len) % len;
    nextTick(() =>
      document
        .querySelector(".search-item.active")
        ?.scrollIntoView({ block: "nearest" }),
    );
  } else if (e.key === "Enter") {
    // Tanpa pilihan aktif, Enter memilih hasil pertama.
    const r = searchResults.value[activeIdx.value >= 0 ? activeIdx.value : 0];
    if (r) {
      e.preventDefault();
      startFrom(r);
    }
  }
};
watch(() => [route.query.type, route.query.nomor], startFromQuery, {
  immediate: true,
});

type NodeData = DocNode & { expanded?: boolean; collapsible?: boolean };

const onCanvasKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!(e.target instanceof Element)) return;
  const id = e.target.closest(".vue-flow__node")?.getAttribute("data-id");
  if (!id) return;
  const data = findNode(id)?.data as NodeData | undefined;
  if (!data) return;

  const key = e.key.toLowerCase();
  if (e.key === "Enter") {
    selectedNode.value = data;
  } else if (key === "e" && !data.locked && !data.expanded) {
    onNodeExpand({ type: data.type, nomor: data.nomor });
  } else if (key === "c" && data.collapsible) {
    onNodeCollapse({ type: data.type, nomor: data.nomor });
  }
};

const csvCell = (v: unknown): string => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const downloadUrl = (url: string, filename: string) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const exportFileName = (ext: string): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  const d = new Date();
  const center = centerNodeId.value
    ? centerNodeId.value.replace(/[\\/:*?"<>|]/g, "-")
    : "graf";
  return `relationship-map_${center}_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.${ext}`;
};

// Daftar dokumen di graf (tanpa tipe yang disembunyikan), urut kiri-ke-kanan
// mengikuti alur. Dokumen terkunci hanya menampilkan tipe dan nomor.
const exportCsv = () => {
  const hid = hiddenNodeIds.value;
  const docs = nodes.value
    .filter((n) => !hid.has(n.id))
    .slice()
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y)
    .map((n) => n.data as DocNode);

  const lines = [
    ["Tipe", "Nomor", "Tanggal", "Keterangan", "Jumlah", "Status"]
      .map(csvCell)
      .join(";"),
  ];
  docs.forEach((d) => {
    lines.push(
      [
        typeLabel(d.type),
        d.nomor,
        d.locked ? "" : d.tanggal,
        d.locked
          ? "Terkunci (tanpa hak lihat)"
          : d.label && d.label !== d.nomor
            ? d.label
            : "",
        d.locked || d.jumlah === undefined
          ? ""
          : String(d.jumlah).replace(".", ","),
        d.locked ? "" : d.status,
      ]
        .map(csvCell)
        .join(";"),
    );
  });

  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  downloadUrl(url, exportFileName("csv"));
  URL.revokeObjectURL(url);
};

const canvasRef = ref<HTMLElement | null>(null);

const exportPng = async () => {
  const el = canvasRef.value;
  if (!el || !hasGraph.value || isExporting.value) return;
  isExporting.value = true; // mematikan sorotan jalur selama ekspor
  const prev = { ...viewport.value };
  try {
    await nextTick();
    await fitView({ padding: 0.1, duration: 0 });
    // html-to-image tidak membawa `fill: none` milik CSS Vue Flow, sehingga
    // garis lengkung terisi hitam. Set langsung sebagai inline style.
    el.querySelectorAll<SVGElement>(".vue-flow__edge-path").forEach((p) => {
      p.style.fill = "none";
    });
    await nextTick();
    // Beri waktu agar transisi redup (0.15s) selesai dan layout stabil.
    await new Promise((r) => setTimeout(r, 300));
    const url = await toPng(el, {
      backgroundColor: "#fafafa",
      pixelRatio: 2,
      filter: (n) =>
        !(
          n instanceof Element &&
          (n.classList.contains("vue-flow__controls") ||
            n.classList.contains("vue-flow__minimap") ||
            n.classList.contains("graph-loading-overlay"))
        ),
    });
    downloadUrl(url, exportFileName("png"));
  } catch {
    toast.error("Gagal membuat gambar.");
  } finally {
    await setViewport(prev, { duration: 0 });
    isExporting.value = false;
  }
};

const minimapColor = (n: Node): string => typeColor((n.data as DocNode).type);

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "";

// Isi setelah dikonfirmasi per tipe (arti `jumlah` berbeda-beda: rupiah, qty, dsb).
const JUMLAH_SATUAN: Partial<Record<NodeType, string>> = {};
const jumlahText = (n: DocNode): string => {
  const v = numFmt(n.jumlah);
  const s = JUMLAH_SATUAN[n.type];
  if (!v || !s) return v;
  return s === "Rp" ? `Rp ${v}` : `${v} ${s}`;
};
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">Relationship Map</h2>
    </div>

    <div class="search-bar">
      <select v-model="searchType" class="f-select" @change="onSearchInput">
        <option value="">Semua Tipe</option>
        <optgroup v-for="g in typeGroups" :key="g.label" :label="g.label">
          <option v-for="t in g.items" :key="t.value" :value="t.value">
            {{ t.title }}
          </option>
        </optgroup>
      </select>

      <div class="search-input-wrap">
        <IconSearch :size="14" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="Ketik nomor dokumen (SPK, PO, Invoice, dll)..."
          @input="onSearchInput"
          @focus="searchResults.length && (showSearchResults = true)"
          @keydown="onSearchKeydown"
        />
        <div v-if="showSearchResults" class="search-dropdown">
          <div v-if="isSearching" class="search-loading">Mencari...</div>
          <div v-else-if="searchError" class="search-empty search-error">
            Gagal mencari. Periksa koneksi lalu coba lagi.
          </div>
          <template v-else>
            <div
              v-for="(r, i) in searchResults"
              :key="`${r.type}:${r.nomor}`"
              class="search-item"
              :class="{ active: i === activeIdx }"
              @mouseenter="activeIdx = i"
              @click="startFrom(r)"
            >
              <span
                class="search-item-type"
                :style="{ background: typeColor(r.type) }"
                >{{ typeLabel(r.type) }}</span
              >
              <span class="search-item-nomor">{{ r.nomor }}</span>
              <span
                v-if="r.label && r.label !== r.nomor"
                class="search-item-label"
                >{{ r.label }}</span
              >
            </div>
            <div v-if="!searchResults.length" class="search-empty">
              Tidak ditemukan.
            </div>
          </template>
        </div>
      </div>

      <v-menu v-if="hasGraph" location="bottom end">
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" size="small" variant="outlined">
            <template #prepend><IconDownload :size="14" /></template>Ekspor
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item :disabled="isExporting" @click="exportPng">
            <v-list-item-title class="menu-title">
              Gambar (PNG)
            </v-list-item-title>
          </v-list-item>
          <v-list-item @click="exportCsv">
            <v-list-item-title class="menu-title">
              Daftar dokumen (CSV)
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-btn
        v-if="hasGraph"
        size="small"
        variant="outlined"
        @click="copyText(pageUrl(), 'Tautan disalin.')"
      >
        Salin tautan
      </v-btn>
      <v-btn
        v-if="hasGraph"
        size="small"
        variant="outlined"
        @click="resetGraph"
      >
        <template #prepend><IconRefresh :size="14" /></template>Reset
      </v-btn>
    </div>

    <div class="graph-area" @click="showSearchResults = false">
      <div ref="canvasRef" class="graph-canvas" @keydown="onCanvasKeydown">
        <div v-if="!hasGraph" class="graph-empty">
          <IconSearch :size="40" :stroke-width="1.3" />
          <div>Cari dokumen di atas untuk mulai menelusuri alurnya.</div>
          <div class="graph-empty-hint">
            Ketik sebagian nomor SPK, PO, Invoice, dll. Pilih tipe di kiri untuk
            mempersempit hasil.<br />
            Klik kartu untuk melihat detail · tombol ⋯ untuk membuka relasi ·
            klik legenda untuk menyembunyikan tipe.
          </div>
        </div>
        <VueFlow
          v-else
          :nodes="displayNodes"
          :edges="displayEdges"
          :node-types="nodeTypes"
          :min-zoom="0.2"
          :max-zoom="1.5"
          fit-view-on-init
          @node-mouse-enter="onNodeMouseEnter"
          @node-mouse-leave="onNodeMouseLeave"
        >
          <template #node-docNode="props">
            <DocNodeComponent
              v-bind="props"
              :dimmed="isDimmed(props.id)"
              :loading="busyIds.has(props.id)"
              @expand="onNodeExpand"
              @collapse="onNodeCollapse"
              @view-detail="onViewDetail"
            />
          </template>
          <Background pattern-color="#e0e0e0" :gap="20" />
          <Controls />
          <MiniMap
            v-if="nodes.length > 12"
            pannable
            zoomable
            :node-color="minimapColor"
          />
        </VueFlow>

        <div v-if="hasGraph" class="graph-legend">
          <button class="graph-legend-toggle" @click="legendOpen = !legendOpen">
            Legenda {{ legendOpen ? "▾" : "▸" }}
          </button>
          <div v-if="legendOpen" class="graph-legend-body">
            <div
              v-for="t in legendTypes"
              :key="t.type"
              class="graph-legend-row graph-legend-row-click"
              :class="{ 'graph-legend-off': hiddenTypes.has(t.type) }"
              title="Klik untuk sembunyikan / tampilkan"
              @click="toggleType(t.type)"
            >
              <span
                class="graph-legend-swatch"
                :style="{ background: t.color }"
              ></span
              >{{ t.label }}
            </div>
            <div
              v-if="hiddenTypes.size"
              class="graph-legend-row graph-legend-row-click"
              @click="showAllTypes"
            >
              Tampilkan semua
            </div>
            <div class="graph-legend-sep"></div>
            <div class="graph-legend-row">
              <span class="graph-legend-line"></span>Relasi dokumen
            </div>
            <div v-if="hasDummyEdge" class="graph-legend-row">
              <span class="graph-legend-line graph-legend-line-dash"></span
              >Urutan alur (bukan relasi database)
            </div>
            <div class="graph-legend-row">
              <span class="graph-legend-swatch graph-legend-center"></span
              >Dokumen pusat
            </div>
            <div v-if="hasLocked" class="graph-legend-row">
              <IconLock :size="11" :stroke-width="2" />Tanpa hak lihat
            </div>
            <div class="graph-legend-sep"></div>
            <div class="graph-legend-hint">
              Fokus kartu (Tab): Enter detail · E relasi · C lipat
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="graph-loading-overlay">
          <v-progress-circular indeterminate color="primary" size="32" />
        </div>
      </div>

      <aside v-if="selectedNode" class="detail-panel">
        <div
          class="detail-panel-header"
          :style="{
            borderTopColor: (TYPE_META[selectedNode.type] || {}).color,
          }"
        >
          <div class="detail-panel-header-text">
            <div
              class="detail-panel-type"
              :style="{ color: (TYPE_META[selectedNode.type] || {}).color }"
            >
              {{
                (TYPE_META[selectedNode.type] || {}).label || selectedNode.type
              }}
            </div>
            <div class="detail-panel-nomor">{{ selectedNode.nomor }}</div>
          </div>
          <div class="detail-panel-header-btns">
            <button
              class="detail-panel-close"
              title="Salin nomor"
              @click="copyText(selectedNode.nomor, 'Nomor disalin.')"
            >
              <IconCopy :size="12" />
            </button>
            <button
              class="detail-panel-close"
              title="Tutup (Esc)"
              @click="selectedNode = null"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="detail-panel-body">
          <div v-if="selectedNode.locked" class="detail-panel-locked">
            Anda tidak memiliki hak lihat untuk tipe dokumen ini, sehingga
            detailnya disembunyikan. Hubungi admin bila perlu akses.
          </div>
          <div
            v-if="
              selectedNode.label && selectedNode.label !== selectedNode.nomor
            "
            class="detail-panel-row"
          >
            <span class="detail-panel-label">Keterangan</span>
            <span class="detail-panel-value">{{ selectedNode.label }}</span>
          </div>
          <div v-if="selectedNode.tanggal" class="detail-panel-row">
            <span class="detail-panel-label">Tanggal</span>
            <span class="detail-panel-value">{{ selectedNode.tanggal }}</span>
          </div>
          <div
            v-if="selectedNode.jumlah !== undefined"
            class="detail-panel-row"
          >
            <span class="detail-panel-label">Jumlah</span>
            <span class="detail-panel-value">{{
              jumlahText(selectedNode)
            }}</span>
          </div>
          <div v-if="selectedNode.kategori" class="detail-panel-row">
            <span class="detail-panel-label">Kategori</span>
            <span class="detail-panel-value">{{ selectedNode.kategori }}</span>
          </div>
          <div
            v-if="selectedNode.cabangAsal && selectedNode.cabangTujuan"
            class="detail-panel-row"
          >
            <span class="detail-panel-label">Rute</span>
            <span class="detail-panel-value"
              >{{ selectedNode.cabangAsal }} →
              {{ selectedNode.cabangTujuan }}</span
            >
          </div>
          <div
            v-if="selectedNode.gdgAsal && selectedNode.gdgTujuan"
            class="detail-panel-row"
          >
            <span class="detail-panel-label">Rute Gudang</span>
            <span class="detail-panel-value"
              >{{ selectedNode.gdgAsal }} → {{ selectedNode.gdgTujuan }}</span
            >
          </div>
          <div v-if="selectedNode.statusPengiriman" class="detail-panel-row">
            <span class="detail-panel-label">Status Pengiriman</span>
            <span class="detail-panel-value">{{
              selectedNode.statusPengiriman
            }}</span>
          </div>
          <div v-if="selectedNode.noFakturPajak" class="detail-panel-row">
            <span class="detail-panel-label">No. Faktur Pajak</span>
            <span class="detail-panel-value">{{
              selectedNode.noFakturPajak
            }}</span>
          </div>
          <div v-if="selectedNode.status" class="detail-panel-row">
            <span class="detail-panel-label">Status</span>
            <span class="detail-panel-value">{{ selectedNode.status }}</span>
          </div>
          <div v-if="selectedNode.statusPpic" class="detail-panel-row">
            <span class="detail-panel-label">Status Konfirmasi</span>
            <span class="detail-panel-value">{{
              selectedNode.statusPpic
            }}</span>
          </div>
          <div v-if="selectedNode.statusKlien" class="detail-panel-row">
            <span class="detail-panel-label">Status Klien</span>
            <span class="detail-panel-value">{{
              selectedNode.statusKlien
            }}</span>
          </div>
          <div v-if="selectedNode.tglEstimasiSo" class="detail-panel-row">
            <span class="detail-panel-label">Estimasi SO</span>
            <span class="detail-panel-value">{{
              selectedNode.tglEstimasiSo
            }}</span>
          </div>
          <div v-if="selectedNode.tglEstimasiMap" class="detail-panel-row">
            <span class="detail-panel-label">Estimasi MAP</span>
            <span class="detail-panel-value">{{
              selectedNode.tglEstimasiMap
            }}</span>
          </div>
          <div v-if="selectedNode.catatan" class="detail-panel-row">
            <span class="detail-panel-label">Catatan</span>
            <span class="detail-panel-value">{{ selectedNode.catatan }}</span>
          </div>

          <div
            v-if="
              selectedNode.isProforma ||
              selectedNode.hasBast ||
              selectedNode.isSelesai ||
              selectedNode.isDiterima ||
              selectedNode.approveStatus
            "
            class="detail-panel-status"
          >
            <span
              v-if="selectedNode.isProforma"
              class="detail-panel-status-badge"
              >PROFORMA</span
            >
            <span
              v-if="selectedNode.hasBast"
              class="detail-panel-status-badge status-bast"
            >
              BAST — jadi {{ numFmt(selectedNode.jumlahJadi) }}
            </span>
            <span
              v-if="selectedNode.isSelesai"
              class="detail-panel-status-badge status-selesai"
              >SELESAI</span
            >
            <span
              v-if="selectedNode.isDiterima"
              class="detail-panel-status-badge status-diterima"
              >DITERIMA</span
            >
            <span
              v-if="selectedNode.approveStatus"
              class="detail-panel-status-badge"
              :class="
                selectedNode.approveStatus === 'APPROVED'
                  ? 'status-selesai'
                  : 'status-batal'
              "
            >
              {{ selectedNode.approveStatus }}
            </span>
            <span
              v-if="selectedNode.hasKuitansi"
              class="detail-panel-status-badge status-selesai"
              >KUITANSI TERBIT</span
            >
            <span
              v-if="selectedNode.isExportedPpn"
              class="detail-panel-status-badge status-selesai"
              >SUDAH EXPORT PPN</span
            >
          </div>
        </div>

        <div class="detail-panel-actions">
          <button
            v-if="canRecenter"
            class="detail-panel-btn detail-panel-btn-secondary"
            title="Menggantikan graf saat ini"
            @click="startFromSelected"
          >
            Jadikan pusat graf
          </button>
          <div v-if="selectedNode.locked" class="detail-panel-unsupported">
            Dokumen ini terkunci untuk akun Anda.
          </div>
          <button
            v-else-if="getDetailRoute(selectedNode)"
            class="detail-panel-btn"
            @click="openDetail(selectedNode)"
          >
            Buka Detail Lengkap
          </button>
          <div v-else class="detail-panel-unsupported">
            Modul ini belum mendukung link langsung. Buka manual dari menu
            terkait.
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 12px;
  gap: 10px;
  position: relative;
}
.page-header {
  display: flex;
  align-items: center;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.f-select {
  height: 32px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  background: white;
  outline: none;
}

.search-input-wrap {
  position: relative;
  flex: 1;
  max-width: 480px;
}
.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #999;
}
.search-input {
  width: 100%;
  height: 32px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px 0 28px;
  font-size: 11px;
  outline: none;
  box-sizing: border-box;
}
.search-input:focus {
  border-color: #1565c0;
}

.search-dropdown {
  position: absolute;
  top: 36px;
  left: 0;
  right: 0;
  max-height: 280px;
  overflow-y: auto;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 20;
}
.search-loading,
.search-empty {
  padding: 10px;
  font-size: 11px;
  color: #999;
  text-align: center;
}
.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 11px;
  border-bottom: 1px solid #f0f0f0;
}
.search-item:hover {
  background: #f0f6ff;
}
.search-item-type {
  font-size: 9px;
  font-weight: 700;
  color: white;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
  white-space: nowrap;
}
.search-error {
  color: #c62828;
}
.search-item-nomor {
  font-weight: 700;
  color: #1a1a1a;
  flex-shrink: 0;
}
.search-item-label {
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.graph-area {
  flex: 1;
  min-height: 0;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  position: relative;
  background: #fafafa;
  display: flex;
  overflow: hidden;
}
.graph-canvas {
  position: relative;
  flex: 1;
  min-width: 0;
}

.graph-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #aaa;
  font-size: 13px;
}
.graph-loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.5);
}

.detail-panel {
  width: 320px;
  flex-shrink: 0;
  height: 100%;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}
.detail-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 18px 16px;
  border-top: 4px solid #555;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  min-height: 56px;
  box-sizing: border-box;
}
.detail-panel-header-text {
  min-width: 0;
}
.detail-panel-type {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}
.detail-panel-nomor {
  font-size: 15px;
  font-weight: 700;
  color: #1a1a1a;
  margin-top: 4px;
  word-break: break-word;
}
.detail-panel-close {
  background: #f2f2f2;
  border: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 11px;
  cursor: pointer;
  color: #666;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.detail-panel-close:hover {
  background: #e0e0e0;
  color: #333;
}
.detail-panel-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
}
.detail-panel-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 0;
  border-bottom: 1px solid #f5f5f5;
}
.detail-panel-label {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.detail-panel-value {
  font-size: 13px;
  color: #333;
}
.detail-panel-status {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.detail-panel-status-badge {
  font-size: 10px;
  font-weight: 700;
  color: white;
  background: #e67e22;
  padding: 3px 8px;
  border-radius: 3px;
}
.status-bast {
  background: #27ae60;
}
.status-selesai {
  background: #1e8449;
}
.status-diterima {
  background: #b9770e;
}
.status-batal {
  background: #922b21;
}
.detail-panel-locked {
  font-size: 11px;
  color: #757575;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 10px;
}
.detail-panel-actions {
  padding: 16px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}
.detail-panel-btn {
  display: block;
  width: 100%;
  border: none;
  cursor: pointer;
  text-align: center;
  background: #1565c0;
  color: white;
  padding: 10px 14px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}
.detail-panel-btn:hover {
  background: #0d47a1;
}
.detail-panel-header-btns {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.detail-panel-btn-secondary {
  width: 100%;
  border: 1px solid #1565c0;
  background: white;
  color: #1565c0;
  cursor: pointer;
  margin-bottom: 8px;
}
.detail-panel-btn-secondary:hover {
  background: #e3f2fd;
}
.graph-canvas :deep(.edge-dim) {
  opacity: 0.12;
}
.graph-legend {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  max-height: 60%;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 11px;
  color: #444;
}
.graph-legend-toggle {
  display: block;
  width: 100%;
  background: none;
  border: none;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
}
.graph-legend-body {
  padding: 2px 8px 6px;
}
.graph-legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}
.graph-legend-row-click {
  cursor: pointer;
}
.graph-legend-row-click:hover {
  color: #1565c0;
}
.graph-legend-off {
  opacity: 0.45;
  text-decoration: line-through;
}
.graph-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.graph-legend-center {
  background: #fffde7;
  border: 2px solid #f1c40f;
}
.graph-legend-line {
  width: 18px;
  border-top: 2px solid #90a4ae;
  flex-shrink: 0;
}
.graph-legend-line-dash {
  border-top: 1px dashed #b0b6bd;
}
.graph-legend-sep {
  border-top: 1px solid #eee;
  margin: 4px 0;
}
.graph-legend-hint {
  color: #888;
  padding-top: 2px;
}
.graph-empty-hint {
  max-width: 420px;
  text-align: center;
  font-size: 11px;
  line-height: 1.6;
  color: #999;
}
.search-item.active {
  background: #f0f6ff;
}
.menu-title {
  font-size: 11px !important;
}
.detail-panel-unsupported {
  font-size: 11px;
  color: #999;
  font-style: italic;
  text-align: center;
}
</style>
