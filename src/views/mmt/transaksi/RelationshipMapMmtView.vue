<script setup lang="ts">
import { ref, computed, shallowRef, markRaw, nextTick } from "vue";
import { VueFlow, Position, type Node, type Edge } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import dagre from "dagre";
import { useToast } from "vue-toastification";
import { IconSearch, IconRefresh } from "@tabler/icons-vue";
import { searchDocs, expandDoc } from "@/services/relationshipMapMmt";
import DocNodeComponent from "@/components/relationship-map/DocNode.vue";
import {
  TYPE_META,
  type NodeType,
  type DocNode,
} from "@/constants/relationshipMapTypes";

import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";

const toast = useToast();

// Instance VueFlow didapat dari event @pane-ready
let flowApi: any = null;
const onPaneReady = (instance: any) => {
  flowApi = instance;
  fitGraphView();
};

const fitGraphView = () => {
  setTimeout(() => {
    try {
      if (flowApi && typeof flowApi.fitView === "function") {
        flowApi.fitView({ padding: 0.2, duration: 300 });
      }
    } catch {
      /* abaikan bila canvas belum siap */
    }
  }, 100);
};

const nodeTypes = { docNode: markRaw(DocNodeComponent) };

const TYPE_OPTIONS: { value: NodeType | ""; title: string }[] = [
  { value: "", title: "Semua Tipe" },
  { value: "MAP", title: "MAP" },
  { value: "SPK", title: "SPK" },
  { value: "SO", title: "SO" },
  { value: "LHK_CETAK", title: "LHK Mesin Cetak" },
  { value: "LHK_TEKSTIL", title: "LHK Tekstil" },
  { value: "LHK_PROOF", title: "LHK Proof" },
  { value: "LHK_PAPERPRINT", title: "LHK Paperprint" },
  { value: "LHK_SUBLIM", title: "LHK Sublim" },
  { value: "LHK_FINISHING", title: "LHK Finishing" },
  { value: "STBJ", title: "STBJ" },
  { value: "JADWAL_KIRIM", title: "Jadwal Kirim" },
  { value: "SJ", title: "Surat Jalan" },
];

type RouteTarget =
  | { name: string; params: { nomor: string } }
  | { name: string; query: { nomor: string } };

const NODE_ROUTE_MAP: Partial<Record<NodeType, (n: DocNode) => RouteTarget>> = {
  MAP: (n) => ({ name: "BastMmtEdit", params: { nomor: n.nomor } }),
  LHK_CETAK: (n) => ({ name: "LhkCetakEdit", params: { nomor: n.nomor } }),
  LHK_TEKSTIL: (n) => ({ name: "tekstilMMTEdit", params: { nomor: n.nomor } }),
  LHK_PROOF: (n) => ({ name: "LHKProofMMTEdit", params: { nomor: n.nomor } }),
  LHK_PAPERPRINT: (n) => ({
    name: "LHKSublimMMTEdit",
    params: { nomor: n.nomor },
  }),
  LHK_SUBLIM: (n) => ({ name: "LhkSublimEdit", params: { nomor: n.nomor } }),
  LHK_FINISHING: (n) => ({
    name: "LhkFinishingEdit",
    params: { nomor: n.nomor },
  }),
  STBJ: (n) => ({ name: "StbjEdit", params: { nomor: n.nomor } }),
  JADWAL_KIRIM: (n) => ({
    name: "JadwalKirimEdit",
    params: { nomor: n.nomor },
  }),
  SJ: (n) => ({
    name: "SuratJalanApproveEdit",
    params: { nomor: n.nomor },
  }),
};

const getDetailRoute = (node: DocNode): RouteTarget | null => {
  const fn = NODE_ROUTE_MAP[node.type];
  if (!fn) return null;
  return fn(node) || null;
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
      const res: any = await searchDocs(
        searchType.value,
        searchQuery.value.trim(),
      );
      const list = res?.data?.data || res?.data || res || [];
      searchResults.value = Array.isArray(list) ? (list as DocNode[]) : [];
      showSearchResults.value = true;
    } catch {
      searchResults.value = [];
    } finally {
      isSearching.value = false;
    }
  }, 300);
};

const CROSS_APP_TYPES: Partial<Record<NodeType, string>> = {
  SPK: "SPK tidak punya halaman detail per-nomor di MMT. Buka manual dari menu Monitoring SPK / SO ke SPK.",
  SO: "SO tidak punya halaman detail per-nomor di MMT. Buka manual dari menu SO ke SPK.",
};

const stripTypePrefix = (v: string) => {
  const m = v.trim().match(/^[A-Z_]+:\s*(.+)$/);
  return (m ? m[1] : v).trim();
};

const onSearchEnter = async () => {
  const keyword = stripTypePrefix(searchQuery.value);
  if (!keyword) return;
  let list = searchResults.value;
  if (!list.length) {
    isSearching.value = true;
    try {
      const res: any = await searchDocs(searchType.value, keyword);
      const parsed = res?.data?.data || res?.data || res || [];
      list = Array.isArray(parsed) ? (parsed as DocNode[]) : [];
      searchResults.value = list;
    } catch {
      toast.error("Gagal mencari dokumen.");
      return;
    } finally {
      isSearching.value = false;
    }
  }
  if (!list.length) {
    toast.warning(`Dokumen "${keyword}" tidak ditemukan.`);
    return;
  }
  const exact =
    list.find((r) => r.nomor.toLowerCase() === keyword.toLowerCase()) ||
    list[0];
  startFrom(exact);
};

// ── Graph state ──
const nodes = shallowRef<Node[]>([]);
const edges = shallowRef<Edge[]>([]);
const expandedIds = ref<Set<string>>(new Set());
const isLoading = ref(false);
const centerNodeId = ref<string | null>(null);

const nodeId = (n: DocNode) => `${n.type}:${n.nomor}`;

const runLayout = () => {
  try {
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
  } catch (err) {
    console.error("Layout dagre gagal, pakai fallback:", err);
    let x = 0;
    nodes.value = nodes.value.map((n) => {
      const position = { x, y: 0 };
      x += 260;
      return {
        ...n,
        position,
        targetPosition: Position.Left,
        sourcePosition: Position.Right,
      };
    });
  }
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

const chainNodesByType = (allNodeIds: string[], typeOrder: string[]) => {
  const chainIds: string[] = [];
  for (const t of typeOrder) {
    const id = allNodeIds.find((nid) => nid.startsWith(`${t}:`));
    if (id) chainIds.push(id);
  }
  for (let i = 0; i < chainIds.length - 1; i++) {
    addEdge(chainIds[i], chainIds[i + 1], true);
  }
};

const chainPengirimanOrder = (allNodeIds: string[]) => {
  chainNodesByType(allNodeIds, [
    "LHK_CETAK",
    "LHK_TEKSTIL",
    "LHK_PROOF",
    "LHK_PAPERPRINT",
    "LHK_SUBLIM",
    "LHK_FINISHING",
    "STBJ",
    "JADWAL_KIRIM",
    "SJ",
  ]);
};

const markExpanded = (id: string) => {
  expandedIds.value.add(id);
  nodes.value = nodes.value.map((n) =>
    n.id === id ? { ...n, data: { ...n.data, expanded: true } } : n,
  );
};

// Helper normalisasi response backend
const unwrapResponse = (raw: any) => {
  // Tangani apakah hasil dari service adalah data langsung atau masih dibungkus Axios
  const payload = raw?.data?.data || raw?.data || raw || {};
  return {
    node: payload.node as DocNode | undefined,
    backward: (Array.isArray(payload.backward)
      ? payload.backward
      : []) as DocNode[],
    forward: (Array.isArray(payload.forward)
      ? payload.forward
      : []) as DocNode[],
  };
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
    const rawRes = await expandDoc(type, nomor);
    const { backward, forward } = unwrapResponse(rawRes);

    backward.forEach((b) => {
      const bId = addNode(b);
      addEdge(bId, id);
    });

    forward.forEach((f) => {
      const fId = addNode(f);
      addEdge(id, fId);
    });

    chainPengirimanOrder(nodes.value.map((n) => n.id));
    markExpanded(id);
    runLayout();

    await nextTick();
    fitGraphView();
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || e.message || "Gagal memuat relasi.",
    );
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
    const rawRes = await expandDoc(doc.type, doc.nomor);
    const { node, backward, forward } = unwrapResponse(rawRes);

    if (!node) {
      toast.warning(
        `Dokumen ${doc.type} ${doc.nomor} tidak ditemukan di database.`,
      );
      return;
    }

    const centerId = addNode(node, true);
    centerNodeId.value = centerId;

    backward.forEach((b) => {
      const bId = addNode(b);
      addEdge(bId, centerId);
    });

    forward.forEach((f) => {
      const fId = addNode(f);
      addEdge(centerId, fId);
    });

    chainPengirimanOrder(nodes.value.map((n) => n.id));
    markExpanded(centerId);
    runLayout();

    await nextTick();
    fitGraphView();
  } catch (e: any) {
    if (e.response?.status === 404) {
      toast.warning(
        `Dokumen ${doc.type} ${doc.nomor} tidak ditemukan di database.`,
      );
    } else {
      toast.error(
        e.response?.data?.message || e.message || "Gagal memuat data.",
      );
    }
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
          placeholder="Ketik nomor dokumen (MAP, SPK, SO, LHK, STBJ, Jadwal, SJ)..."
          @input="onSearchInput"
          @keyup.enter="onSearchEnter"
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
              >
                {{ r.label }}
              </span>
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
        :fit-view-on-init="true"
        @pane-ready="onPaneReady"
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
          <span class="detail-panel-value">
            {{ numFmt(selectedNode.jumlah) }}
          </span>
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
          <span class="detail-panel-value">
            {{ selectedNode.cabangAsal }} → {{ selectedNode.cabangTujuan }}
          </span>
        </div>
        <div
          v-if="selectedNode.gdgAsal && selectedNode.gdgTujuan"
          class="detail-panel-row"
        >
          <span class="detail-panel-label">Rute Gudang</span>
          <span class="detail-panel-value">
            {{ selectedNode.gdgAsal }} → {{ selectedNode.gdgTujuan }}
          </span>
        </div>
        <div v-if="selectedNode.statusPengiriman" class="detail-panel-row">
          <span class="detail-panel-label">Status Pengiriman</span>
          <span class="detail-panel-value">
            {{ selectedNode.statusPengiriman }}
          </span>
        </div>
        <div v-if="selectedNode.noFakturPajak" class="detail-panel-row">
          <span class="detail-panel-label">No. Faktur Pajak</span>
          <span class="detail-panel-value">
            {{ selectedNode.noFakturPajak }}
          </span>
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
          >
            PROFORMA
          </span>
          <span
            v-if="selectedNode.hasBast"
            class="detail-panel-status-badge status-bast"
          >
            BAST — jadi {{ numFmt(selectedNode.jumlahJadi) }}
          </span>
          <span
            v-if="selectedNode.isSelesai"
            class="detail-panel-status-badge status-selesai"
          >
            SELESAI
          </span>
          <span
            v-if="selectedNode.isDiterima"
            class="detail-panel-status-badge status-diterima"
          >
            DITERIMA
          </span>
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
          >
            KUITANSI TERBIT
          </span>
          <span
            v-if="selectedNode.isExportedPpn"
            class="detail-panel-status-badge status-selesai"
          >
            SUDAH EXPORT PPN
          </span>
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
  /* Parent (.main-content-top) tingginya indefinite (scrollable),
     jadi height:100% resolve ke auto dan Vue Flow tidak dapat dimensi.
     Pakai min-height agar rantai tinggi selalu definitif. */
  height: auto;
  min-height: calc(100vh - 180px);
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
  flex: none;
  /* Tinggi definitif: Vue Flow (height:100%) butuh parent berdimensi pasti.
     100vh dikurangi navbar + padding konten + header/search page ini. */
  height: calc(100vh - 330px);
  min-height: 480px;
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
