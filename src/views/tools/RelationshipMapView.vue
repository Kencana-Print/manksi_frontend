<script setup lang="ts">
import { ref, computed, shallowRef, markRaw } from "vue";
import {
  VueFlow,
  useVueFlow,
  Position,
  type Node,
  type Edge,
} from "@vue-flow/core";
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
import { IconSearch, IconRefresh } from "@tabler/icons-vue";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";

const toast = useToast();
const { fitView } = useVueFlow();

const nodeTypes = { docNode: markRaw(DocNodeComponent) };

const TYPE_OPTIONS: { value: NodeType | ""; title: string }[] = [
  { value: "", title: "Semua Tipe" },
  { value: "PERMINTAAN_HARGA", title: "Permintaan Harga" },
  { value: "PENAWARAN", title: "Penawaran" },
  { value: "MAP", title: "MAP" },
  { value: "SPK", title: "SPK" },
  { value: "SO", title: "SO" },
  { value: "PROOF", title: "Proof Garmen" },
  { value: "SJ_MEMO", title: "SJ Memo" },
  { value: "MPPB", title: "MPPB" },
  { value: "MKB", title: "MKB" },
  { value: "PO", title: "PO" },
  { value: "BPB", title: "BPB" },
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
  { value: "KASBON", title: "Uang Muka (Kasbon)" },
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
];

type RouteTarget =
  | { name: string; params: { nomor: string } }
  | { name: string; query: { nomor: string } };

// ⚠️ 6 tipe SENGAJA tidak dimasukkan (STBJ, SJ, INVOICE non-proforma,
// BPJ, VOUCHER, KASBON) karena route edit mereka di router.ts tidak
// punya param :nomor (kemungkinan pakai store/query state), atau
// (VOUCHER/KASBON) hidup di app Finance ERP terpisah — bukan di
// router MANKSI ini. Jangan ditambah sampai ada konfirmasi cara
// deep-link yang benar untuk keenamnya.
const NODE_ROUTE_MAP: Partial<Record<NodeType, (n: DocNode) => RouteTarget>> = {
  PERMINTAAN_HARGA: (n) => ({
    name: "PermintaanHargaEdit",
    params: { nomor: n.nomor },
  }),
  PENAWARAN: (n) => ({ name: "PenawaranFormEdit", params: { nomor: n.nomor } }),
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
      : { name: "InvoiceFormEdit", query: { nomor: n.nomor } },
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
    return routeName
      ? { name: routeName, params: { nomor: n.nomor } }
      : (undefined as unknown as RouteTarget);
  },
  PELUNASAN_PIUTANG: (n) => ({
    name: "PelunasanPiutangEdit",
    params: { nomor: n.nomor },
  }),
  STBJ: (n) => ({ name: "StbjFormEdit", query: { nomor: n.nomor } }),
  SJ: (n) => ({ name: "SuratJalanFormEdit", query: { nomor: n.nomor } }),

  BPJ: (n) => ({ name: "BpbJasaFormEdit", query: { nomor: n.nomor } }),
  SJ_TAK_NORMAL: (n) => ({
    name: "SjTakNormalFormEdit",
    query: { nomor: n.nomor },
  }),
  INVOICE_TAK_NORMAL: (n) => ({
    name: "InvoiceTakNormalFormEdit",
    query: { nomor: n.nomor },
  }),
};

const CROSS_APP_TYPES: Partial<Record<NodeType, string>> = {
  VOUCHER: "Voucher Pembayaran ada di aplikasi Finance ERP, bukan MANKSI.",
  KASBON: "Uang Muka (Kasbon) ada di aplikasi Finance ERP, bukan MANKSI.",
};

const getDetailRoute = (node: DocNode): RouteTarget | null => {
  const fn = NODE_ROUTE_MAP[node.type];
  if (!fn) return null;
  const route = fn(node);
  return route || null;
};

const searchType = ref<NodeType | "">("");
const searchQuery = ref("");
const searchResults = ref<DocNode[]>([]);
const showSearchResults = ref(false);
const isSearching = ref(false);

let searchDebounce: ReturnType<typeof setTimeout> | null = null;
const onSearchInput = () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    showSearchResults.value = false;
    return;
  }
  searchDebounce = setTimeout(async () => {
    isSearching.value = true;
    try {
      const res = await relationshipMapService.search(
        searchType.value,
        searchQuery.value.trim(),
      );
      searchResults.value = res.data.data || [];
      showSearchResults.value = true;
    } catch {
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }, 300);
};

// ── Graph state ──
const nodes = shallowRef<Node[]>([]);
const edges = shallowRef<Edge[]>([]);
const expandedIds = ref<Set<string>>(new Set());
const isLoading = ref(false);
const centerNodeId = ref<string | null>(null);

const nodeId = (n: DocNode) => `${n.type}:${n.nomor}`;

const runLayout = () => {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.value.forEach((n) => g.setNode(n.id, { width: 170, height: 90 }));
  edges.value.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  nodes.value = nodes.value.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - 85, y: pos.y - 45 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
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

const markExpanded = (id: string) => {
  expandedIds.value.add(id);
  nodes.value = nodes.value.map((n) =>
    n.id === id ? { ...n, data: { ...n.data, expanded: true } } : n,
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
  if (expandedIds.value.has(id)) return;

  isLoading.value = true;
  try {
    const res = await relationshipMapService.expand(type, nomor);
    const { backward, forward } = res.data.data;

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
    chainMutasiProduksiOrder(forwardIds);
    chainPengirimanOrder(nodes.value.map((n) => n.id));
    chainKasbonMutasiOrder(nodes.value.map((n) => n.id));
    markExpanded(id);
    runLayout();
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat relasi.");
  } finally {
    isLoading.value = false;
  }
};

const startFrom = async (doc: DocNode) => {
  showSearchResults.value = false;
  searchQuery.value = `${doc.type}: ${doc.nomor}`;

  nodes.value = [];
  edges.value = [];
  expandedIds.value = new Set();

  isLoading.value = true;
  try {
    const res = await relationshipMapService.expand(doc.type, doc.nomor);
    const { node, backward, forward } = res.data.data;

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
    chainMutasiProduksiOrder(forwardIds);
    chainPengirimanOrder(nodes.value.map((n) => n.id));
    chainKasbonMutasiOrder(nodes.value.map((n) => n.id));
    markExpanded(centerId);
    runLayout();
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

const onNodeExpand = (payload: { type: string; nomor: string }) => {
  expandNode(payload as { type: NodeType; nomor: string });
};

const resetGraph = () => {
  nodes.value = [];
  edges.value = [];
  expandedIds.value = new Set();
  centerNodeId.value = null;
  searchQuery.value = "";
};

const hasGraph = computed(() => nodes.value.length > 0);

const selectedNode = ref<DocNode | null>(null);

const onViewDetail = (docNode: DocNode) => {
  selectedNode.value = docNode;
};

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "";
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">Relationship Map</h2>
    </div>

    <div class="search-bar">
      <select v-model="searchType" class="f-select">
        <option v-for="t in TYPE_OPTIONS" :key="t.value" :value="t.value">
          {{ t.title }}
        </option>
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
        />
        <div v-if="showSearchResults" class="search-dropdown">
          <div v-if="isSearching" class="search-loading">Mencari...</div>
          <template v-else>
            <div
              v-for="r in searchResults"
              :key="`${r.type}:${r.nomor}`"
              class="search-item"
              @click="startFrom(r)"
            >
              <span class="search-item-type">{{ r.type }}</span>
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
      <div v-if="!hasGraph" class="graph-empty">
        <IconSearch :size="40" :stroke-width="1.3" />
        <div>Cari dokumen di atas untuk mulai menelusuri alurnya.</div>
      </div>
      <VueFlow
        v-else
        :nodes="nodes"
        :edges="edges"
        :node-types="nodeTypes"
        :min-zoom="0.2"
        :max-zoom="1.5"
        fit-view-on-init
        @node-click="() => {}"
      >
        <template #node-docNode="props">
          <DocNodeComponent
            v-bind="props"
            @expand="onNodeExpand"
            @view-detail="onViewDetail"
          />
        </template>
        <Background pattern-color="#e0e0e0" :gap="20" />
        <Controls />
      </VueFlow>
      <div v-if="isLoading" class="graph-loading-overlay">
        <v-progress-circular indeterminate color="primary" size="32" />
      </div>
    </div>
  </div>

  <div
    v-if="selectedNode"
    class="detail-panel-overlay"
    @click.self="selectedNode = null"
  >
    <div class="detail-panel">
      <div
        class="detail-panel-header"
        :style="{ borderTopColor: (TYPE_META[selectedNode.type] || {}).color }"
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
        <button
          class="detail-panel-close"
          title="Tutup"
          @click="selectedNode = null"
        >
          ✕
        </button>
      </div>

      <div class="detail-panel-body">
        <div
          v-if="selectedNode.label && selectedNode.label !== selectedNode.nomor"
          class="detail-panel-row"
        >
          <span class="detail-panel-label">Keterangan</span>
          <span class="detail-panel-value">{{ selectedNode.label }}</span>
        </div>
        <div v-if="selectedNode.tanggal" class="detail-panel-row">
          <span class="detail-panel-label">Tanggal</span>
          <span class="detail-panel-value">{{ selectedNode.tanggal }}</span>
        </div>
        <div v-if="selectedNode.jumlah !== undefined" class="detail-panel-row">
          <span class="detail-panel-label">Jumlah</span>
          <span class="detail-panel-value">{{
            numFmt(selectedNode.jumlah)
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
          <span v-if="selectedNode.isProforma" class="detail-panel-status-badge"
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
        <router-link
          v-if="getDetailRoute(selectedNode)"
          :to="getDetailRoute(selectedNode)!"
          target="_blank"
          class="detail-panel-btn"
        >
          Buka Detail Lengkap ↗
        </router-link>
        <div
          v-else-if="CROSS_APP_TYPES[selectedNode.type]"
          class="detail-panel-unsupported"
        >
          {{ CROSS_APP_TYPES[selectedNode.type] }} Buka manual dari aplikasi
          tersebut.
        </div>
        <div v-else class="detail-panel-unsupported">
          Modul ini belum mendukung link langsung. Buka manual dari menu
          terkait.
        </div>
      </div>
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
  font-size: 12px;
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
  font-size: 12px;
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
  font-size: 12px;
  color: #999;
  text-align: center;
}
.search-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  cursor: pointer;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.search-item:hover {
  background: #f0f6ff;
}
.search-item-type {
  font-size: 9px;
  font-weight: 700;
  color: white;
  background: #1565c0;
  padding: 1px 6px;
  border-radius: 3px;
  flex-shrink: 0;
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

.detail-panel-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.15);
  display: flex;
  justify-content: flex-end;
  z-index: 9999;
}
.detail-panel {
  width: 320px;
  height: 100vh;
  background: white;
  box-shadow: -6px 0 20px rgba(0, 0, 0, 0.12);
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
  font-size: 12px;
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
.detail-panel-actions {
  padding: 16px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}
.detail-panel-btn {
  display: block;
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
.detail-panel-unsupported {
  font-size: 11px;
  color: #999;
  font-style: italic;
  text-align: center;
}
</style>
