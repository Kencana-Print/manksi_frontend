<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import PageLayout from "@/components/PageLayout.vue";
import {
  IconPlus,
  IconPencil,
  IconTrash,
  IconTable,
  IconFileSpreadsheet,
  IconX,
  IconRefresh,
  IconFilterOff,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconChevronUp,
  IconChevronDown,
  IconFilter,
  IconAdjustmentsHorizontal,
  IconSearch,
  IconSearchOff,
  IconDatabaseOff,
  IconAlertTriangle,
} from "@tabler/icons-vue";

const props = withDefaults(
  defineProps<{
    title: string;
    menuId: string;
    icon?: any;
    headers: any[];
    items: any[];
    isLoading?: boolean;
    searchPlaceholder?: string;
    itemValue?: string;
    canInsert?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canExport?: boolean;
    selectStrategy?: "single" | "page" | "all";
    rowPropsFn?: (data: any) => any;
    showExpand?: boolean;
    expanded?: any[];
    selected?: any[];
    loadingDetails?: Set<string>;
    itemsPerPage?: number;
    // Filter eksternal dari parent (misal: filterDate, filterStatus, dll)
    // BaseBrowse akan otomatis simpan & restore via sessionStorage
    filterState?: Record<string, any>;
    // Summary bar — opsional, tampilkan total nilai kolom tertentu di footer
    summaryKey?: string; // key kolom yang akan di-sum, cth: "Nominal"
    summaryLabel?: string; // label di kiri, cth: "Total Nominal"
  }>(),
  {
    icon: () => IconTable,
    isLoading: false,
    searchPlaceholder: "Cari data...",
    itemValue: "Kode",
    canInsert: false,
    canEdit: false,
    canDelete: false,
    canExport: false,
    selectStrategy: "single",
    selected: () => [],
    showExpand: false,
    expanded: () => [],
    loadingDetails: () => new Set<string>(),
    itemsPerPage: 50,
    filterState: () => ({}),
  },
);

const emit = defineEmits([
  "refresh",
  "add",
  "edit",
  "delete",
  "export",
  "row-click",
  "update:expanded",
  "update:selected",
  "update:filterState",
]);

// ── Session storage key — unik per halaman berdasarkan menuId ──────────
const storageKey = computed(() => `browse_filter_${props.menuId}`);

const loadState = () => {
  try {
    const raw = sessionStorage.getItem(storageKey.value);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveState = () => {
  try {
    sessionStorage.setItem(
      storageKey.value,
      JSON.stringify({
        search: search.value,
        currentPage: currentPage.value,
        perPage: perPage.value,
        // Simpan filterState eksternal bersamaan dalam satu key
        filterState: props.filterState,
      }),
    );
  } catch {
    /* storage penuh, abaikan */
  }
};

// ── State — di-restore dari session jika ada ──────────────────────────
const saved = loadState();
const search = ref<string>(saved?.search ?? "");
const currentPage = ref<number>(saved?.currentPage ?? 1);
const perPage = ref<number>(saved?.perPage ?? props.itemsPerPage);
const deleteDialog = ref(false);
const pendingDeleteItem = ref<any>(null);

// Restore filterState ke parent saat mount jika ada nilai tersimpan
onMounted(() => {
  if (saved?.filterState && Object.keys(saved.filterState).length > 0) {
    // Emit synchronously sebelum parent melakukan fetch
    emit("update:filterState", saved.filterState);
  }
});

// Auto-save: watch internal state + filterState dari parent sekaligus
watch([search, currentPage, perPage, () => props.filterState], saveState, {
  flush: "post",
  deep: true,
});

// ── Selection ──────────────────────────────────────────────────────────
const internalSelected = computed({
  get: () => props.selected || [],
  set: (val) => emit("update:selected", val),
});
const isSingleSelected = computed(() => internalSelected.value.length === 1);

// ── Column Order (Drag & Drop) ──────────────────────────────────────
const colOrderKey = computed(() => `browse_colorder_${props.menuId}`);

const loadColOrder = (): string[] => {
  try {
    const raw = localStorage.getItem(colOrderKey.value);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveColOrder = (order: string[]) => {
  try {
    localStorage.setItem(colOrderKey.value, JSON.stringify(order));
  } catch {}
};

const colOrder = ref<string[]>(loadColOrder());

const orderedHeaders = computed(() => {
  if (colOrder.value.length === 0) return props.headers;
  const map = new Map(props.headers.map((h: any) => [h.key, h]));
  const ordered: any[] = [];
  for (const key of colOrder.value) {
    if (map.has(key)) ordered.push(map.get(key));
  }
  for (const h of props.headers) {
    if (!colOrder.value.includes(h.key)) ordered.push(h);
  }
  return ordered;
});

const resetColOrder = () => {
  colOrder.value = [];
  localStorage.removeItem(colOrderKey.value);
};

// ── Headers ────────────────────────────────────────────────────────────
const finalHeaders = computed(() => {
  if (!props.showExpand) return orderedHeaders.value;
  return [
    { title: "", key: "data-table-expand", width: "48px", sortable: false },
    ...orderedHeaders.value,
  ];
});

// ── Column Filter (ala Excel/desktop app) ─────────────────────────────
// State: { [columnKey]: Set<string> } — nilai yang DI-CENTANG (aktif)
const columnFilters = ref<Record<string, Set<string>>>({});

// Dropdown state
const activeFilterCol = ref<string | null>(null);
const filterDropdownStyle = ref<Record<string, string>>({});
const colFilterSearch = ref<Record<string, string>>({});

// Semua nilai unik per kolom — dari props.items (bukan filteredItems,
// agar list tidak berubah saat filter lain aktif)
const uniqueValuesPerCol = computed(() => {
  const result: Record<string, string[]> = {};
  for (const h of props.headers) {
    const key = h.key;
    if (!key || key === "data-table-expand") continue;
    const vals = new Set<string>();
    for (const item of props.items) {
      vals.add(String(item[key] ?? ""));
    }
    result[key] = Array.from(vals).sort((a, b) =>
      a.localeCompare(b, "id", { numeric: true }),
    );
  }
  return result;
});

// Nilai unik yang sudah difilter oleh colFilterSearch
const filteredUniqueVals = (key: string) => {
  const s = (colFilterSearch.value[key] ?? "").toLowerCase();
  const all = uniqueValuesPerCol.value[key] ?? [];
  return s ? all.filter((v) => v.toLowerCase().includes(s)) : all;
};

// Apakah kolom ini punya filter aktif?
// Filter aktif = Set ada DAN tidak berisi semua nilai (ada yang di-exclude)
const colHasFilter = (key: string) => {
  const s = columnFilters.value[key];
  if (!s) return false;
  const total = uniqueValuesPerCol.value[key]?.length ?? 0;
  return s.size < total;
};

// Jumlah kolom yang aktif difilter
const activeFilterCount = computed(
  () => Object.keys(columnFilters.value).filter((k) => colHasFilter(k)).length,
);

// Toggle satu nilai di filter kolom
const toggleColFilter = (key: string, val: string) => {
  if (!columnFilters.value[key]) {
    const allVals = uniqueValuesPerCol.value[key] ?? [];
    columnFilters.value[key] = new Set(allVals);
  }
  const s = columnFilters.value[key];
  if (s.has(val)) s.delete(val);
  else s.add(val);
  columnFilters.value = { ...columnFilters.value };
  currentPage.value = 1;
};

// Pilih semua = Set berisi semua nilai = tidak ada filter
const selectAllCol = (key: string) => {
  const allVals = uniqueValuesPerCol.value[key] ?? [];
  columnFilters.value[key] = new Set(allVals);
  columnFilters.value = { ...columnFilters.value };
  currentPage.value = 1;
};

// Sembunyikan semua = Set kosong = tidak ada yang lolos
const hideAllCol = (key: string) => {
  columnFilters.value[key] = new Set();
  columnFilters.value = { ...columnFilters.value };
  currentPage.value = 1;
};

// Buka/tutup dropdown filter kolom
const openColFilter = (key: string, event: MouseEvent) => {
  if (activeFilterCol.value === key) {
    activeFilterCol.value = null;
    return;
  }

  // Inisialisasi Set dengan SEMUA nilai jika kolom belum pernah difilter
  // Sehingga saat pertama buka, semua tercentang — uncheck = exclude nilai tsb
  if (!columnFilters.value[key]) {
    const allVals = uniqueValuesPerCol.value[key] ?? [];
    columnFilters.value[key] = new Set(allVals);
    columnFilters.value = { ...columnFilters.value };
  }

  const th = (event.currentTarget as HTMLElement).closest("th");
  if (th) {
    const rect = th.getBoundingClientRect();
    filterDropdownStyle.value = {
      position: "fixed",
      top: `${rect.bottom + 2}px`,
      left: `${rect.left}px`,
      zIndex: "9999",
    };
  }
  activeFilterCol.value = key;
  if (!colFilterSearch.value[key]) colFilterSearch.value[key] = "";
};

const closeColFilter = () => {
  activeFilterCol.value = null;
};

// Klik di luar dropdown → tutup
const onTableWrapClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (
    !target.closest(".col-filter-dropdown") &&
    !target.closest(".col-filter-btn")
  ) {
    closeColFilter();
  }
};

// ── Column Resize ──────────────────────────────────────────────────────
// Simpan lebar override per kolom (key → px)
const colWidths = ref<Record<string, number>>({});

let resizing: {
  key: string;
  startX: number;
  startW: number;
} | null = null;

const onResizeStart = (key: string, e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();

  // Cari th yang aktif untuk dapat lebar saat ini
  const handle = e.currentTarget as HTMLElement;
  const th = handle.closest("th") as HTMLElement;
  const currentW = th
    ? th.getBoundingClientRect().width
    : (colWidths.value[key] ?? 80);

  resizing = { key, startX: e.clientX, startW: currentW };

  const onMove = (ev: MouseEvent) => {
    if (!resizing) return;
    const delta = ev.clientX - resizing.startX;
    const newW = Math.max(40, resizing.startW + delta);
    colWidths.value = { ...colWidths.value, [resizing.key]: newW };
  };

  const onUp = () => {
    resizing = null;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
};

// Hitung style width kolom: override > prop > auto
const colStyle = (col: any) => {
  const key = col.key;
  if (colWidths.value[key]) {
    return {
      width: `${colWidths.value[key]}px`,
      minWidth: `${colWidths.value[key]}px`,
    };
  }
  if (col.width)
    return { width: col.width, minWidth: col.minWidth ?? col.width };
  if (col.minWidth) return { minWidth: col.minWidth };
  return {};
};

const filteredItems = computed(() => {
  let result = props.items;

  // 1. Search global
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter((item) =>
      Object.values(item).some((v) =>
        String(v ?? "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }

  // 2. Column filters — filter aktif kalau Set tidak berisi semua nilai unik
  for (const [key, allowed] of Object.entries(columnFilters.value)) {
    const total = uniqueValuesPerCol.value[key]?.length ?? 0;
    if (!allowed || allowed.size >= total) continue; // semua tampil, skip
    result = result.filter((item) => allowed.has(String(item[key] ?? "")));
  }

  return result;
});

// ── Scroll sync: summary bar ikut scroll horizontal tabel ─────────────
const tableWrapRef = ref<HTMLElement | null>(null);
const summaryBarRef = ref<HTMLElement | null>(null);

const onTableScroll = () => {
  if (!tableWrapRef.value || !summaryBarRef.value) return;
  // Cari elemen scroll aktual dari Vuetify (.v-table__wrapper)
  const scroller = tableWrapRef.value.querySelector(
    ".v-table__wrapper",
  ) as HTMLElement | null;
  if (!scroller) return;
  summaryBarRef.value.scrollLeft = scroller.scrollLeft;
};

// ── Summary right offset — hitung lebar kolom setelah summaryKey ─────
// Dipakai sebagai padding-right summary bar agar nilai tepat di bawah kolom
const summaryRightOffset = computed(() => {
  if (!props.summaryKey) return "12px";
  const idx = props.headers.findIndex((h) => h.key === props.summaryKey);
  if (idx === -1) return "12px";
  // Jumlahkan lebar kolom setelah summaryKey
  let px = 0;
  for (let i = idx + 1; i < props.headers.length; i++) {
    const w = props.headers[i].width ?? props.headers[i].minWidth ?? "100px";
    px += parseInt(String(w)) || 100;
  }
  // Tambah lebar expand column jika ada
  if (props.showExpand) px += 48;
  return `${px + 12}px`;
});

// ── Summary total ──────────────────────────────────────────────────────
const summaryTotal = computed(() => {
  if (!props.summaryKey) return 0;
  return filteredItems.value.reduce(
    (sum, item) => sum + (Number(item[props.summaryKey!]) || 0),
    0,
  );
});
const summaryFormatted = computed(() =>
  new Intl.NumberFormat("id-ID").format(summaryTotal.value),
);

const totalItems = computed(() => filteredItems.value.length);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalItems.value / perPage.value)),
);
const pageStart = computed(() =>
  totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1,
);
const pageEnd = computed(() =>
  Math.min(currentPage.value * perPage.value, totalItems.value),
);

const visiblePages = computed(() => {
  const total = totalPages.value;
  const cur = currentPage.value;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, cur - 2);
  let end = Math.min(total, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

const goToPage = (p: number) => {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value));
};

const jumpPageInput = ref<number | null>(null);
const onJumpPage = () => {
  if (jumpPageInput.value) {
    goToPage(jumpPageInput.value);
    jumpPageInput.value = null;
  }
};

const onSearch = (val: string) => {
  search.value = val;
  currentPage.value = 1;
};

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return filteredItems.value.slice(start, start + perPage.value);
});

// ── Row props ──────────────────────────────────────────────────────────
const handleRowClick = (event: PointerEvent, { item }: { item: any }) => {
  const raw = item?.raw || item;
  if (props.selectStrategy === "single") {
    if (
      internalSelected.value.length > 0 &&
      internalSelected.value[0][props.itemValue] === raw[props.itemValue]
    ) {
      internalSelected.value = [];
    } else {
      internalSelected.value = [raw];
    }
  }
  emit("row-click", raw);
};

const resolvedRowProps = (data: any) => {
  let customProps: any = {};
  if (props.rowPropsFn) customProps = props.rowPropsFn(data);
  const raw = data.item?.raw || data.item;
  const isSelected = internalSelected.value.some(
    (s) => s[props.itemValue] === raw[props.itemValue],
  );
  let classes = customProps.class || "";
  if (isSelected) classes += " row-selected";
  return {
    ...customProps,
    class: classes,
    style: "cursor: pointer; " + (customProps.style || ""),
  };
};

// ── Delete confirmation ────────────────────────────────────────────────
const requestDelete = (item: any) => {
  pendingDeleteItem.value = item;
  deleteDialog.value = true;
};
const confirmDelete = () => {
  emit("delete", pendingDeleteItem.value);
  deleteDialog.value = false;
  pendingDeleteItem.value = null;
};

// ── Empty state ────────────────────────────────────────────────────────
const emptyStateText = computed(() =>
  search.value
    ? `Tidak ada hasil untuk "${search.value}"`
    : "Belum ada data tersedia",
);
const emptyStateSubtext = computed(() =>
  search.value
    ? "Coba kata kunci lain atau hapus filter pencarian"
    : "Klik tombol + Baru untuk menambahkan data pertama",
);

// ── Expose ─────────────────────────────────────────────────────────────
const clearSelection = () => {
  internalSelected.value = [];
};
defineExpose({ clearSelection, search });

// ── Column Drag (Pointer-based, bukan HTML5 drag) ────────────────────
const dragSrcKey = ref<string | null>(null);
const dragOverKey = ref<string | null>(null);
const isDragging = ref(false);

// Pointer drag state
let pointerDragKey: string | null = null;
let autoScrollTimer: number | null = null;

const onColPointerDown = (key: string, e: PointerEvent) => {
  if (key === "data-table-expand") return;
  // Hanya dari drag handle (class col-drag-handle)
  const target = e.target as HTMLElement;
  if (!target.classList.contains("col-drag-handle")) return;

  pointerDragKey = key;
  dragSrcKey.value = key;
  isDragging.value = true;

  // Capture pointer agar tetap track meski keluar elemen
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};

const onColPointerMove = (e: PointerEvent) => {
  if (!isDragging.value || !pointerDragKey) return;

  // Cari th di bawah pointer
  const els = document.elementsFromPoint(e.clientX, e.clientY);
  const th = els.find(
    (el) => el.tagName === "TH" && el.hasAttribute("data-col-key"),
  ) as HTMLElement | undefined;

  if (th) {
    const key = th.getAttribute("data-col-key");
    if (key && key !== pointerDragKey) {
      dragOverKey.value = key;
    }
  }

  // Auto-scroll horizontal saat pointer mendekati tepi tabel
  const wrapper = tableWrapRef.value?.querySelector(
    ".v-table__wrapper",
  ) as HTMLElement | null;
  if (!wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const EDGE = 80; // px dari tepi mulai scroll
  const SPEED = 12;

  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
    autoScrollTimer = null;
  }

  if (e.clientX < rect.left + EDGE) {
    autoScrollTimer = window.setInterval(() => {
      wrapper.scrollLeft -= SPEED;
    }, 16);
  } else if (e.clientX > rect.right - EDGE) {
    autoScrollTimer = window.setInterval(() => {
      wrapper.scrollLeft += SPEED;
    }, 16);
  }
};

const onColPointerUp = () => {
  if (!isDragging.value) return;

  if (autoScrollTimer) {
    clearInterval(autoScrollTimer);
    autoScrollTimer = null;
  }

  if (
    pointerDragKey &&
    dragOverKey.value &&
    pointerDragKey !== dragOverKey.value
  ) {
    const currentOrder = orderedHeaders.value
      .map((h) => h.key)
      .filter((k) => k && k !== "data-table-expand");

    const srcIdx = currentOrder.indexOf(pointerDragKey);
    const tgtIdx = currentOrder.indexOf(dragOverKey.value);

    if (srcIdx !== -1 && tgtIdx !== -1) {
      const newOrder = [...currentOrder];
      newOrder.splice(srcIdx, 1);
      newOrder.splice(tgtIdx, 0, pointerDragKey);
      colOrder.value = newOrder;
      saveColOrder(newOrder);
    }
  }

  pointerDragKey = null;
  dragSrcKey.value = null;
  dragOverKey.value = null;
  isDragging.value = false;
};

watch(
  () => filteredItems.value.length,
  () => {
    // Reset ke halaman 1 jika halaman sekarang melebihi total halaman
    if (currentPage.value > totalPages.value) {
      currentPage.value = 1;
    }
  },
);
</script>

<template>
  <PageLayout :title="title" :menu-id="menuId" :icon="icon">
    <!-- Tombol aksi di header PageLayout — tidak ikut scroll -->
    <template #header-actions>
      <v-btn v-if="canInsert" size="small" color="primary" @click="emit('add')">
        <template #prepend><IconPlus :size="15" :stroke-width="2" /></template>
        Baru
      </v-btn>
      <v-btn
        v-if="canEdit"
        size="small"
        :disabled="!isSingleSelected"
        @click="emit('edit', internalSelected[0])"
      >
        <template #prepend
          ><IconPencil :size="15" :stroke-width="1.7"
        /></template>
        Ubah
      </v-btn>
      <v-btn
        v-if="canDelete"
        size="small"
        color="error"
        :disabled="!isSingleSelected"
        @click="requestDelete(internalSelected[0])"
      >
        <template #prepend
          ><IconTrash :size="15" :stroke-width="1.7"
        /></template>
        Hapus
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="green"
        @click="emit('export')"
      >
        <template #prepend
          ><IconFileSpreadsheet :size="15" :stroke-width="1.7"
        /></template>
        Export
      </v-btn>
      <slot name="extra-actions" :selected="internalSelected" />
      <v-btn size="small" variant="text" @click="$router.back()">
        <template #prepend><IconX :size="15" :stroke-width="2" /></template>
        Tutup
      </v-btn>
    </template>

    <!-- Main Content -->
    <div class="browse-content">
      <!-- Filter Bar -->
      <div class="filter-bar">
        <slot name="filter-left" />
        <slot name="filter-right-prepend" />
        <v-text-field
          :model-value="search"
          @update:model-value="onSearch"
          :placeholder="searchPlaceholder"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="search-field"
        >
          <template #prepend-inner>
            <IconSearch
              :size="15"
              :stroke-width="1.7"
              style="opacity: 0.55; margin-top: 1px"
            />
          </template>
        </v-text-field>
        <v-btn
          @click="emit('refresh')"
          color="primary"
          variant="text"
          :loading="isLoading"
          size="small"
          icon
        >
          <IconRefresh :size="18" :stroke-width="1.7" />
        </v-btn>
        <!-- Reset column filter -->
        <v-btn
          v-if="activeFilterCount > 0"
          size="small"
          color="warning"
          variant="tonal"
          @click="columnFilters = {}"
        >
          <template #prepend
            ><IconFilterOff :size="15" :stroke-width="1.7"
          /></template>
          Reset Filter ({{ activeFilterCount }})
        </v-btn>

        <v-btn
          v-if="colOrder.length > 0"
          size="small"
          color="blue-grey"
          variant="tonal"
          @click="resetColOrder"
          title="Reset urutan kolom ke default"
        >
          <template #prepend><IconAdjustmentsHorizontal :size="15" /></template>
          Reset Kolom
        </v-btn>
        <v-spacer />
        <slot name="filter-right" />
      </div>

      <!-- Table + Summary wrapper -->
      <div class="table-section">
        <div
          class="table-wrap"
          ref="tableWrapRef"
          @click="onTableWrapClick"
          @scroll.passive="onTableScroll"
        >
          <v-data-table
            v-model="internalSelected"
            :headers="finalHeaders"
            :items="pagedItems"
            :loading="isLoading"
            :item-value="itemValue"
            :select-strategy="selectStrategy"
            :expanded="expanded"
            @update:expanded="emit('update:expanded', $event)"
            return-object
            density="compact"
            fixed-header
            hide-default-footer
            :items-per-page="perPage"
            class="base-table"
            :row-props="resolvedRowProps"
            @click:row="handleRowClick"
            sort-asc-icon=""
            sort-desc-icon=""
            :cell-props="({ value }) => ({ title: value ?? '' })"
          >
            <!-- Custom header dengan tombol filter + resize per kolom -->
            <template #headers="{ columns, isSorted, getSortIcon, toggleSort }">
              <tr>
                <template
                  v-for="col in columns"
                  :key="String(col.key ?? col.title ?? '')"
                >
                  <th
                    :data-col-key="col.key"
                    :style="colStyle(col)"
                    :class="[
                      'base-th',
                      col.align ? `text-${col.align}` : '',
                      dragOverKey === col.key && dragSrcKey !== col.key
                        ? 'col-drag-over'
                        : '',
                      dragSrcKey === col.key ? 'col-dragging' : '',
                    ]"
                    @pointerdown="
                      col.key &&
                      col.key !== 'data-table-expand' &&
                      onColPointerDown(col.key, $event)
                    "
                    @pointermove="onColPointerMove($event)"
                    @pointerup="onColPointerUp"
                    @pointercancel="onColPointerUp"
                  >
                    <div class="th-inner">
                      <!-- Drag handle icon -->
                      <span
                        v-if="col.key && col.key !== 'data-table-expand'"
                        class="col-drag-handle"
                        title="Drag untuk pindah kolom"
                        >⠿</span
                      >
                      <span
                        class="th-title"
                        :class="{ sortable: col.sortable !== false }"
                        @click="col.sortable !== false && toggleSort(col)"
                      >
                        {{ col.title }}
                        <IconChevronUp
                          v-if="
                            isSorted(col) && getSortIcon(col) === '$sortAsc'
                          "
                          :size="11"
                          style="display: inline; vertical-align: middle"
                        />
                        <IconChevronDown
                          v-else-if="isSorted(col)"
                          :size="11"
                          style="display: inline; vertical-align: middle"
                        />
                      </span>
                      <button
                        v-if="col.key && col.key !== 'data-table-expand'"
                        class="col-filter-btn"
                        :class="{ active: colHasFilter(col.key) }"
                        @click.stop="openColFilter(col.key, $event)"
                      >
                        <IconFilter
                          v-if="colHasFilter(col.key)"
                          :size="10"
                          :stroke-width="2"
                        />
                        <IconAdjustmentsHorizontal
                          v-else
                          :size="10"
                          :stroke-width="2"
                        />
                      </button>
                    </div>
                    <div
                      v-if="col.key && col.key !== 'data-table-expand'"
                      class="col-resize-handle"
                      @mousedown.stop="onResizeStart(col.key, $event)"
                    />
                  </th>
                </template>
              </tr>
            </template>

            <!-- Pass-through slots -->
            <template
              v-for="slotName in Object.keys($slots).filter(
                (k) =>
                  ![
                    'extra-actions',
                    'filter-left',
                    'filter-right-prepend',
                    'filter-right',
                    'detail',
                    'summary-row',
                  ].includes(k),
              )"
              v-slot:[slotName]="slotProps"
            >
              <slot :name="slotName" v-bind="slotProps" />
            </template>

            <template #loading>
              <v-skeleton-loader type="table-row@10" />
            </template>

            <!-- Empty state informatif -->
            <template #no-data>
              <div class="empty-state">
                <IconSearchOff
                  v-if="search"
                  :size="40"
                  :stroke-width="1.3"
                  class="empty-icon"
                />
                <IconDatabaseOff
                  v-else
                  :size="40"
                  :stroke-width="1.3"
                  class="empty-icon"
                />
                <div class="empty-text">{{ emptyStateText }}</div>
                <div class="empty-subtext">{{ emptyStateSubtext }}</div>
                <v-btn
                  v-if="search"
                  size="small"
                  variant="text"
                  color="primary"
                  @click="search = ''"
                >
                  Hapus Pencarian
                </v-btn>
              </div>
            </template>

            <!-- Expanded row -->
            <template #expanded-row="{ columns, item }">
              <tr>
                <td :colspan="columns.length" class="expanded-cell">
                  <div class="expanded-inner">
                    <div class="expanded-wrapper">
                      <slot name="detail" :item="item.raw || item" />
                    </div>
                  </div>
                </td>
              </tr>
            </template>
          </v-data-table>
        </div>
        <!-- /.table-wrap -->

        <!-- Summary bar — di luar v-table__wrapper, sync scroll horizontal via JS -->
        <div
          v-if="summaryKey || $slots['summary-row']"
          class="summary-bar-outer"
          ref="summaryBarRef"
        >
          <div class="summary-bar-inner">
            <template v-if="$slots['summary-row']">
              <slot name="summary-row" :filtered-items="filteredItems" />
            </template>
            <template v-else>
              <span class="summary-lbl">{{ summaryLabel || summaryKey }}</span>
              <span class="summary-val">{{ summaryFormatted }}</span>
            </template>
          </div>
        </div>
      </div>
      <!-- /.table-section -->

      <!-- ── Custom Pagination ── -->
      <div class="pagination-bar">
        <!-- Kiri: range info -->
        <span class="page-info">
          {{ pageStart }}–{{ pageEnd }} dari {{ totalItems }} data
        </span>

        <v-spacer />

        <!-- Tengah: navigasi halaman -->
        <div class="page-controls">
          <button
            class="page-btn icon-btn"
            :disabled="currentPage === 1"
            @click="goToPage(1)"
            title="Halaman pertama"
          >
            <IconChevronsLeft :size="15" :stroke-width="2" />
          </button>
          <button
            class="page-btn icon-btn"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
            title="Sebelumnya"
          >
            <IconChevronLeft :size="15" :stroke-width="2" />
          </button>

          <button
            v-for="p in visiblePages"
            :key="p"
            class="page-btn"
            :class="{ active: p === currentPage }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>

          <button
            class="page-btn icon-btn"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
            title="Berikutnya"
          >
            <IconChevronRight :size="15" :stroke-width="2" />
          </button>
          <button
            class="page-btn icon-btn"
            :disabled="currentPage === totalPages"
            @click="goToPage(totalPages)"
            title="Halaman terakhir"
          >
            <IconChevronsRight :size="15" :stroke-width="2" />
          </button>

          <!-- Jump input -->
          <input
            v-model.number="jumpPageInput"
            type="number"
            class="jump-input"
            :placeholder="String(currentPage)"
            :min="1"
            :max="totalPages"
            @keydown.enter="onJumpPage"
            @blur="onJumpPage"
            title="Ketik nomor halaman lalu Enter"
          />
          <span class="page-of">dari {{ totalPages }}</span>
        </div>

        <v-spacer />

        <!-- Kanan: per page -->
        <div class="per-page-wrap">
          <span class="page-info">Per halaman</span>
          <select
            v-model="perPage"
            class="per-page-select"
            @change="currentPage = 1"
          >
            <option v-for="n in [25, 50, 100, 200]" :key="n" :value="n">
              {{ n }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="deleteDialog" max-width="400px" persistent>
      <v-card class="confirm-dialog-card rounded-lg">
        <v-card-title class="d-flex align-center pa-4 bg-error-lighten-5">
          <IconAlertTriangle
            :size="20"
            :stroke-width="1.7"
            color="#c62828"
            class="mr-2"
          />
          <span class="text-subtitle-1 font-weight-bold text-error">
            Konfirmasi Hapus
          </span>
        </v-card-title>

        <v-card-text class="pa-5 pt-4">
          <div class="text-body-2 mb-1">
            Apakah Anda yakin ingin menghapus data ini?
          </div>

          <div
            v-if="pendingDeleteItem"
            class="text-body-2 font-weight-black text-decoration-underline"
          >
            {{
              pendingDeleteItem.Nama ||
              pendingDeleteItem.nama ||
              pendingDeleteItem.Kode ||
              pendingDeleteItem.kode
            }}
          </div>

          <div class="text-caption text-grey-darken-1 mt-3">
            Tindakan ini tidak dapat dibatalkan.
          </div>
        </v-card-text>

        <v-divider />

        <v-card-actions class="pa-3 bg-grey-lighten-4">
          <v-spacer />

          <v-btn
            variant="text"
            class="font-weight-bold"
            @click="deleteDialog = false"
          >
            Batal
          </v-btn>

          <v-btn
            color="error"
            variant="elevated"
            class="font-weight-bold px-6"
            @click="confirmDelete"
          >
            Ya, Hapus
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </PageLayout>

  <!-- ── Column Filter Dropdown — Teleport ke body agar tidak ter-clip ── -->
  <Teleport to="body">
    <div
      v-if="activeFilterCol"
      class="col-filter-dropdown"
      :style="filterDropdownStyle"
      @click.stop
    >
      <!-- Search dalam dropdown -->
      <div class="cfd-search">
        <input
          v-model="colFilterSearch[activeFilterCol]"
          type="text"
          placeholder="Cari..."
          class="cfd-search-input"
          @click.stop
        />
      </div>

      <!-- Aksi cepat -->
      <div class="cfd-actions">
        <button class="cfd-action-btn" @click="selectAllCol(activeFilterCol)">
          Tampilkan Semua
        </button>
        <span class="cfd-sep">|</span>
        <button
          class="cfd-action-btn text-error"
          @click="hideAllCol(activeFilterCol)"
        >
          Sembunyikan Semua
        </button>
      </div>

      <div class="cfd-divider" />

      <!-- List nilai unik -->
      <div class="cfd-list">
        <label
          v-for="val in filteredUniqueVals(activeFilterCol)"
          :key="val"
          class="cfd-item"
        >
          <input
            type="checkbox"
            :checked="columnFilters[activeFilterCol]?.has(val) ?? true"
            @change="toggleColFilter(activeFilterCol, val)"
          />
          <span class="cfd-val">{{ val === "" ? "(Kosong)" : val }}</span>
        </label>
        <div
          v-if="filteredUniqueVals(activeFilterCol).length === 0"
          class="cfd-empty"
        >
          Tidak ada hasil
        </div>
      </div>

      <!-- Footer -->
      <div class="cfd-footer">
        <button class="cfd-ok-btn" @click="closeColFilter">OK</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Layout utama ── */
.browse-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1 1 0;
  min-height: 0;
  gap: 8px;
  padding: 8px;
  overflow: hidden;
}

/* ── Filter bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  padding: 7px 12px;
  flex-shrink: 0;
  min-height: 50px;
  height: auto; /* ← dari fixed jadi auto */
  flex-wrap: wrap; /* ← biar bisa wrap kalau perlu */
  align-items: center;
  z-index: 5;
}

.search-field {
  width: 160px; /* dari 220px */
  min-width: 120px;
  flex-shrink: 0;
}
.search-field :deep(.v-input__control) {
  height: 34px;
}
.search-field :deep(.v-field) {
  height: 34px;
  font-size: 12px;
  background: rgb(var(--v-theme-surface));
}
.search-field :deep(.v-field__input) {
  padding-top: 0;
  padding-bottom: 0;
  min-height: unset;
  font-size: 12px;
  align-self: center;
}
.search-field :deep(.v-field__prepend-inner) {
  padding-top: 0;
  align-items: center;
  align-self: center;
}
.search-field :deep(.v-field__clearable) {
  align-items: center;
  align-self: center;
  padding-top: 0;
}

/* ── Table section (tabel + summary) ── */
.table-section {
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: auto;
  flex: 1; /* isi sisa ruang vertikal */
  min-height: 0; /* wajib agar flex child bisa scroll */
}

/* ── Tabel ── */
.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto; /* scroll vertikal DAN horizontal ada di sini */
}

.base-table :deep(.v-table__wrapper) {
  overflow: auto;
  flex: 1;
  min-height: 0;
}

.base-table {
  font-size: 12px;
  height: 100%; /* isi penuh table-wrap */
}
.base-table :deep(thead th) {
  background-color: #1565c0 !important;
  color: white !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  height: 34px !important;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.base-table :deep(tbody td) {
  font-size: 12px;
  height: 28px !important;
  padding: 0 8px !important;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;

  /* 3 baris di bawah ini adalah KUNCI truncation (ellipsis) */
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
.base-table :deep(tbody tr:nth-of-type(odd)) {
  background-color: rgba(var(--v-theme-on-surface), 0.02);
}
.base-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.06) !important;
}
.base-table :deep(tbody tr.row-selected) {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
  color: rgb(var(--v-theme-primary)) !important;
}
.base-table :deep(tbody tr.row-selected:hover) {
  background-color: rgba(var(--v-theme-primary), 0.22) !important;
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  gap: 6px;
}
.empty-icon {
  color: rgba(var(--v-theme-on-surface), 0.3);
  margin-bottom: 4px;
}
.empty-text {
  font-size: 13px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.empty-subtext {
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

/* ── Expanded row ── */
.expanded-cell {
  padding: 0 !important;
  background-color: rgba(var(--v-theme-surface-variant), 0.35) !important;
}
.expanded-inner {
  padding: 6px 10px;
  width: auto; /* ← dari 100% jadi auto */
  box-sizing: border-box;
}
.expanded-wrapper {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  display: inline-block;
  max-width: fit-content; /* ← lebar pas konten */
}

/* Detail table dalam expanded */
.expanded-wrapper :deep(table) {
  font-size: 11px !important;
  border-collapse: collapse;
  width: 100%;
  background: rgb(var(--v-theme-surface));
}
.expanded-wrapper :deep(thead tr) {
  background: #1565c0 !important;
}
.expanded-wrapper :deep(th) {
  font-size: 11px !important;
  font-weight: 700 !important;
  color: white !important;
  padding: 4px 7px !important;
  white-space: nowrap;
  letter-spacing: 0.02em;
}
.expanded-wrapper :deep(td) {
  font-size: 11px !important;
  padding: 3px 7px !important;
  height: 26px !important;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  vertical-align: middle;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
}
.expanded-wrapper :deep(tbody tr:nth-of-type(even) td) {
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.expanded-wrapper :deep(tbody tr:hover td) {
  background: rgba(var(--v-theme-primary), 0.06) !important;
}

/* ── Summary bar (sticky, sync scroll horizontal) ── */
.summary-bar-outer {
  overflow-x: hidden; /* scroll dikendalikan JS dari tabel */
  overflow-y: hidden;
  background: #1565c0;
  flex-shrink: 0;
  border-top: 2px solid #0d47a1;
}
.summary-bar-inner {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 5px 12px;
  height: 30px;
  white-space: nowrap;
  /* Lebar minimum sama dengan tabel agar ikut scroll horizontal */
  min-width: max-content;
}
.summary-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}
.summary-val {
  font-size: 13px;
  font-weight: 700;
  color: white;
  font-family: monospace;
  letter-spacing: 0.02em;
}

/* ── Pagination bar ── */
.pagination-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 2px;
  flex-shrink: 0;
  flex-grow: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.page-info {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  white-space: nowrap;
}

.page-controls {
  display: flex;
  align-items: center;
  gap: 3px;
}

.page-btn {
  min-width: 30px;
  height: 30px;
  padding: 0 7px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: rgb(var(--v-theme-surface));
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.page-btn:hover:not(:disabled) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.4);
  color: rgb(var(--v-theme-primary));
}
.page-btn.active {
  background-color: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: white;
  font-weight: 700;
}
.page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.jump-input {
  width: 46px;
  height: 30px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  text-align: center;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  outline: none;
  margin-left: 6px;
  transition: border-color 0.15s;
  -moz-appearance: textfield;
  appearance: textfield;
}
.jump-input::-webkit-inner-spin-button,
.jump-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
.jump-input:focus {
  border-color: rgb(var(--v-theme-primary));
}

.page-of {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  white-space: nowrap;
  margin-left: 4px;
}

.per-page-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.per-page-select {
  height: 30px;
  padding: 0 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  cursor: pointer;
  outline: none;
}
.per-page-select:focus {
  border-color: rgb(var(--v-theme-primary));
}

/* ── Custom header ── */
.base-th {
  background-color: #1565c0 !important;
  color: white !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  height: 34px !important;
  white-space: nowrap;
  padding: 0 8px !important;
  user-select: none;
  position: relative; /* penting untuk resize handle */
  overflow: visible !important;
}

.th-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  width: 100%;
  padding-right: 6px;
}

.th-title {
  flex: 1;
  white-space: nowrap;
  /* Tidak ada overflow:hidden atau text-overflow — teks tampil penuh */
}
.th-title.sortable {
  cursor: pointer;
}
.th-title.sortable:hover {
  opacity: 0.85;
}

/* Tombol filter di header kolom */
.col-filter-btn {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: all 0.15s;
  line-height: 1;
}
.col-filter-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-color: rgba(255, 255, 255, 0.7);
}
.col-filter-btn.active {
  background: #ffd54f;
  border-color: #ffd54f;
  color: #1a1a1a;
}

/* ── Resize handle ── */
.col-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  /* Garis tipis sebagai visual cue */
  border-right: 2px solid rgba(255, 255, 255, 0.25);
  transition: border-color 0.15s;
}
.col-resize-handle:hover,
.col-resize-handle:active {
  border-right-color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.1);
}
</style>

/* ── Column Filter Dropdown — global (tidak scoped) ── */
<style>
.col-filter-dropdown {
  background: var(--v-theme-surface, white);
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  width: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
}

.cfd-search {
  padding: 8px 8px 4px;
}
.cfd-search-input {
  width: 100%;
  height: 28px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.cfd-search-input:focus {
  border-color: rgb(var(--v-theme-primary));
}

.cfd-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}
.cfd-action-btn {
  background: none;
  border: none;
  font-size: 11px;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  padding: 2px 0;
}
.cfd-action-btn:hover {
  text-decoration: underline;
}
.cfd-action-btn.text-error {
  color: #c62828;
}
.cfd-sep {
  color: rgba(var(--v-border-color), var(--v-border-opacity));
  font-size: 11px;
}

.cfd-divider {
  height: 1px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
  margin: 0;
}

.cfd-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}

.cfd-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  cursor: pointer;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  transition: background 0.1s;
}
.cfd-item:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.cfd-item input[type="checkbox"] {
  width: 13px;
  height: 13px;
  cursor: pointer;
  flex-shrink: 0;
  accent-color: rgb(var(--v-theme-primary));
}
.cfd-val {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cfd-empty {
  padding: 8px 10px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  text-align: center;
}

.cfd-footer {
  padding: 6px 8px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  display: flex;
  justify-content: flex-end;
}
.cfd-ok-btn {
  background: rgb(var(--v-theme-primary));
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.cfd-ok-btn:hover {
  opacity: 0.88;
}
:deep(.v-data-table__th--sortable .v-icon) {
  display: none;
}
:deep(.base-th .v-icon) {
  display: none !important;
}

.base-table :deep(tbody td) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  height: 28px !important;
  max-height: 28px !important;
  max-width: 0 !important; /* KUNCI: paksa ellipsis bekerja di td */
  padding: 0 8px !important;
}

.base-table :deep(tbody tr) {
  height: 28px !important;
  max-height: 28px !important;
}

.base-table :deep(table) {
  table-layout: fixed !important;
  width: 100% !important;
}

/* ── MENGATASI BARIS MELAR KARENA TOMBOL EXPAND VUETIFY (AGRESIF) ── */

/* 1. Paksa tinggi baris tabel sekeras mungkin */
.base-table :deep(.v-data-table__wrapper table tbody tr) {
  height: 28px !important;
  max-height: 28px !important;
}

.base-table :deep(.v-data-table__wrapper table tbody td) {
  height: 28px !important;
  max-height: 28px !important;
  box-sizing: border-box !important; /* Mencegah padding menambah tinggi */
}

/* 2. Target SEMUA kemungkinan class tombol expand Vuetify */
.base-table :deep(.v-data-table__expand-icon),
.base-table :deep(td:first-child .v-btn),
.base-table :deep(td button.v-btn--icon) {
  height: 20px !important;
  width: 20px !important;
  min-height: 20px !important;
  min-width: 20px !important;
  padding: 0 !important;
  margin: 0 auto !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
}

/* 3. Kecilkan icon di dalam tombol */
.base-table :deep(.v-data-table__expand-icon .v-icon),
.base-table :deep(td:first-child .v-btn .v-icon) {
  font-size: 16px !important;
}

/* 4. Sembunyikan elemen ripple (efek klik) yang sering memakan ruang */
.base-table :deep(td:first-child .v-btn__overlay),
.base-table :deep(td:first-child .v-ripple__container) {
  display: none !important;
}

/* 5. Khusus sel pertama (tempat panah expand berada), persempit ruangnya */
.base-table :deep(td:first-child) {
  padding-left: 2px !important;
  padding-right: 2px !important;
  width: 32px !important;
  min-width: 32px !important;
  max-width: 32px !important;
}

.expanded-wrapper {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  overflow: hidden; /* sudah ada */
  background: rgb(var(--v-theme-surface));
  display: inline-block; /* ← KUNCI: lebar mengikuti konten, bukan parent */
  min-width: 300px; /* minimal agar tidak terlalu kecil */
  max-width: 100%; /* tidak melebihi lebar container */
}

.confirm-dialog-card :deep(*) {
  font-size: 11px !important;
}

.confirm-dialog-card :deep(.text-subtitle-1) {
  font-size: 13px !important;
}

.bg-error-lighten-5 {
  background-color: #ffebee;
}

.col-dragging {
  opacity: 0.5;
  background-color: #0a3d91 !important;
}
.col-drag-over {
  background-color: #0d47a1 !important;
  box-shadow: inset 3px 0 0 #ffd54f;
}
.col-drag-handle {
  cursor: grab;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  flex-shrink: 0;
  margin-right: 3px;
  user-select: none;
  touch-action: none; /* penting untuk pointer events */
}
.col-drag-handle:active {
  cursor: grabbing;
}
</style>
