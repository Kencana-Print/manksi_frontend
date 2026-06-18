<script setup lang="ts">
import { ref, computed, watch } from "vue";
import {
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconChevronUp,
  IconChevronDown,
  IconFilter,
  IconAdjustmentsHorizontal,
  IconFilterOff,
  IconSearch,
  IconSearchOff,
  IconDatabaseOff,
} from "@tabler/icons-vue";

const props = withDefaults(
  defineProps<{
    headers: any[];
    items: any[];
    isLoading?: boolean;
    searchPlaceholder?: string;
    itemValue?: string;
    selectStrategy?: "single" | "page" | "all";
    rowPropsFn?: (data: any) => any;
    showExpand?: boolean;
    expanded?: any[];
    selected?: any[];
    loadingDetails?: Set<string>;
    itemsPerPage?: number;
    summaryKey?: string;
    summaryLabel?: string;
    // Kalau false, sembunyikan search bar
    showSearch?: boolean;
  }>(),
  {
    isLoading: false,
    searchPlaceholder: "Cari data...",
    itemValue: "id",
    selectStrategy: "single",
    selected: () => [],
    showExpand: false,
    expanded: () => [],
    loadingDetails: () => new Set<string>(),
    itemsPerPage: 50,
    showSearch: true,
  },
);

const emit = defineEmits(["row-click", "update:expanded", "update:selected"]);

// ── Search ──
const search = ref("");
const onSearch = (val: string) => {
  search.value = val;
  currentPage.value = 1;
};

// ── Selection ──
const internalSelected = computed({
  get: () => props.selected || [],
  set: (val) => emit("update:selected", val),
});

// ── Column Filter ──
const columnFilters = ref<Record<string, Set<string>>>({});
const activeFilterCol = ref<string | null>(null);
const filterDropdownStyle = ref<Record<string, string>>({});
const colFilterSearch = ref<Record<string, string>>({});

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

const filteredUniqueVals = (key: string) => {
  const s = (colFilterSearch.value[key] ?? "").toLowerCase();
  const all = uniqueValuesPerCol.value[key] ?? [];
  return s ? all.filter((v) => v.toLowerCase().includes(s)) : all;
};

const colHasFilter = (key: string) => {
  const s = columnFilters.value[key];
  if (!s) return false;
  const total = uniqueValuesPerCol.value[key]?.length ?? 0;
  return s.size < total;
};

const activeFilterCount = computed(
  () => Object.keys(columnFilters.value).filter((k) => colHasFilter(k)).length,
);

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

const selectAllCol = (key: string) => {
  const allVals = uniqueValuesPerCol.value[key] ?? [];
  columnFilters.value[key] = new Set(allVals);
  columnFilters.value = { ...columnFilters.value };
  currentPage.value = 1;
};

const hideAllCol = (key: string) => {
  columnFilters.value[key] = new Set();
  columnFilters.value = { ...columnFilters.value };
  currentPage.value = 1;
};

const openColFilter = (key: string, event: MouseEvent) => {
  if (activeFilterCol.value === key) {
    activeFilterCol.value = null;
    return;
  }
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

const onTableWrapClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (
    !target.closest(".col-filter-dropdown") &&
    !target.closest(".col-filter-btn")
  ) {
    closeColFilter();
  }
};

// ── Column Resize ──
const colWidths = ref<Record<string, number>>({});
let resizing: { key: string; startX: number; startW: number } | null = null;

const onResizeStart = (key: string, e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
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

const colStyle = (col: any) => {
  const key = col.key;
  if (colWidths.value[key])
    return {
      width: `${colWidths.value[key]}px`,
      minWidth: `${colWidths.value[key]}px`,
    };
  if (col.width)
    return { width: col.width, minWidth: col.minWidth ?? col.width };
  if (col.minWidth) return { minWidth: col.minWidth };
  return {};
};

// ── Filter ──
const filteredItems = computed(() => {
  let result = props.items;
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
  for (const [key, allowed] of Object.entries(columnFilters.value)) {
    const total = uniqueValuesPerCol.value[key]?.length ?? 0;
    if (!allowed || allowed.size >= total) continue;
    result = result.filter((item) => allowed.has(String(item[key] ?? "")));
  }
  return result;
});

// ── Summary ──
const tableWrapRef = ref<HTMLElement | null>(null);

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

// ── Pagination ──
const currentPage = ref(1);
const perPage = ref(props.itemsPerPage);

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

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return filteredItems.value.slice(start, start + perPage.value);
});

watch(
  () => filteredItems.value.length,
  () => {
    if (currentPage.value > totalPages.value) currentPage.value = 1;
  },
);

// ── Row props ──
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

// ── Expose ──
defineExpose({ search, currentPage });
</script>

<template>
  <div class="bt-wrap" @click="onTableWrapClick">
    <!-- ── Toolbar (search + filter reset) ── -->
    <div class="bt-toolbar">
      <slot name="toolbar-left" />

      <v-text-field
        v-if="showSearch"
        :model-value="search"
        @update:model-value="onSearch"
        :placeholder="searchPlaceholder"
        variant="outlined"
        density="compact"
        hide-details
        clearable
        class="bt-search"
      >
        <template #prepend-inner>
          <IconSearch
            :size="14"
            :stroke-width="1.7"
            style="opacity: 0.55; margin-top: 1px"
          />
        </template>
      </v-text-field>

      <v-btn
        v-if="activeFilterCount > 0"
        size="small"
        color="warning"
        variant="tonal"
        @click="columnFilters = {}"
      >
        <template #prepend
          ><IconFilterOff :size="14" :stroke-width="1.7"
        /></template>
        Reset Filter ({{ activeFilterCount }})
      </v-btn>

      <v-spacer />
      <slot name="toolbar-right" />
    </div>

    <!-- ── Table section ── -->
    <div class="bt-table-section">
      <div class="bt-table-wrap" ref="tableWrapRef">
        <v-data-table
          v-model="internalSelected"
          :headers="headers"
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
          class="bt-table"
          :row-props="resolvedRowProps"
          @click:row="handleRowClick"
          sort-asc-icon=""
          sort-desc-icon=""
          :cell-props="({ value }) => ({ title: value ?? '' })"
        >
          <!-- Custom header -->
          <template #headers="{ columns, isSorted, getSortIcon, toggleSort }">
            <tr>
              <template
                v-for="col in columns"
                :key="String(col.key ?? col.title ?? '')"
              >
                <th
                  :data-col-key="col.key"
                  :style="colStyle(col)"
                  :class="['bt-th', col.align ? `text-${col.align}` : '']"
                >
                  <div class="th-inner">
                    <span
                      class="th-title"
                      :class="{ sortable: col.sortable !== false }"
                      @click="col.sortable !== false && toggleSort(col)"
                    >
                      {{ col.title }}
                      <IconChevronUp
                        v-if="isSorted(col) && getSortIcon(col) === '$sortAsc'"
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
                !['toolbar-left', 'toolbar-right', 'summary-row'].includes(k),
            )"
            v-slot:[slotName]="slotProps"
          >
            <slot :name="slotName" v-bind="slotProps" />
          </template>

          <template #loading>
            <v-skeleton-loader type="table-row@8" />
          </template>

          <template #no-data>
            <div class="bt-empty">
              <IconSearchOff
                v-if="search"
                :size="36"
                :stroke-width="1.3"
                class="bt-empty-icon"
              />
              <IconDatabaseOff
                v-else
                :size="36"
                :stroke-width="1.3"
                class="bt-empty-icon"
              />
              <div class="bt-empty-text">
                {{
                  search
                    ? `Tidak ada hasil untuk "${search}"`
                    : "Belum ada data"
                }}
              </div>
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

          <template #expanded-row="{ columns, item }">
            <tr>
              <td :colspan="columns.length" class="bt-expanded-cell">
                <div class="bt-expanded-inner">
                  <slot name="detail" :item="item.raw || item" />
                </div>
              </td>
            </tr>
          </template>

          <template #bottom>
            <div
              v-if="summaryKey || $slots['summary-row']"
              class="bt-summary-sticky"
            >
              <template v-if="$slots['summary-row']">
                <slot name="summary-row" :filtered-items="filteredItems" />
              </template>
              <template v-else>
                <span class="bt-summary-lbl">{{
                  summaryLabel || summaryKey
                }}</span>
                <span class="bt-summary-val">{{ summaryFormatted }}</span>
              </template>
            </div>
          </template>
        </v-data-table>
      </div>
    </div>

    <!-- ── Pagination ── -->
    <div class="bt-pagination">
      <span class="bt-page-info">
        {{ pageStart }}–{{ pageEnd }} dari {{ totalItems }} data
      </span>
      <v-spacer />
      <div class="bt-page-controls">
        <button
          class="bt-page-btn icon-btn"
          :disabled="currentPage === 1"
          @click="goToPage(1)"
        >
          <IconChevronsLeft :size="14" :stroke-width="2" />
        </button>
        <button
          class="bt-page-btn icon-btn"
          :disabled="currentPage === 1"
          @click="goToPage(currentPage - 1)"
        >
          <IconChevronLeft :size="14" :stroke-width="2" />
        </button>
        <button
          v-for="p in visiblePages"
          :key="p"
          class="bt-page-btn"
          :class="{ active: p === currentPage }"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
        <button
          class="bt-page-btn icon-btn"
          :disabled="currentPage === totalPages"
          @click="goToPage(currentPage + 1)"
        >
          <IconChevronRight :size="14" :stroke-width="2" />
        </button>
        <button
          class="bt-page-btn icon-btn"
          :disabled="currentPage === totalPages"
          @click="goToPage(totalPages)"
        >
          <IconChevronsRight :size="14" :stroke-width="2" />
        </button>
        <input
          v-model.number="jumpPageInput"
          type="number"
          class="bt-jump-input"
          :placeholder="String(currentPage)"
          :min="1"
          :max="totalPages"
          @keydown.enter="onJumpPage"
          @blur="onJumpPage"
        />
        <span class="bt-page-of">dari {{ totalPages }}</span>
      </div>
      <v-spacer />
      <div class="bt-per-page">
        <span class="bt-page-info">Per halaman</span>
        <select
          v-model="perPage"
          class="bt-per-page-sel"
          @change="currentPage = 1"
        >
          <option v-for="n in [25, 50, 100, 200]" :key="n" :value="n">
            {{ n }}
          </option>
        </select>
      </div>
    </div>
  </div>

  <!-- Column Filter Dropdown -->
  <Teleport to="body">
    <div
      v-if="activeFilterCol"
      class="col-filter-dropdown"
      :style="filterDropdownStyle"
      @click.stop
    >
      <div class="cfd-search">
        <input
          v-model="colFilterSearch[activeFilterCol]"
          type="text"
          placeholder="Cari..."
          class="cfd-search-input"
          @click.stop
        />
      </div>
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
      <div class="cfd-footer">
        <button class="cfd-ok-btn" @click="closeColFilter">OK</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ── Wrapper ── */
.bt-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 6px;
}

/* ── Toolbar ── */
.bt-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.bt-search {
  width: 160px;
  min-width: 100px;
  flex-shrink: 0;
}
.bt-search :deep(.v-input__control) {
  height: 32px;
}
.bt-search :deep(.v-field) {
  height: 32px;
  font-size: 12px;
  background: rgb(var(--v-theme-surface));
}
.bt-search :deep(.v-field__input) {
  padding-top: 0;
  padding-bottom: 0;
  min-height: unset;
  font-size: 12px;
  align-self: center;
}
.bt-search :deep(.v-field__prepend-inner),
.bt-search :deep(.v-field__clearable) {
  padding-top: 0;
  align-items: center;
  align-self: center;
}

/* ── Table section ── */
.bt-table-section {
  display: flex;
  flex-direction: column;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}
.bt-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

/* ── Table styles ── */
.bt-table {
  font-size: 12px;
  height: 100%;
}
.bt-table :deep(.v-table__wrapper) {
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.bt-table :deep(tbody td) {
  font-size: 12px;
  height: 28px !important;
  padding: 0 8px !important;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  max-width: 0 !important;
}
.bt-table :deep(tbody tr) {
  height: 28px !important;
  max-height: 28px !important;
}
.bt-table :deep(table) {
  table-layout: fixed !important;
  width: 100% !important;
}
.bt-table :deep(tbody tr:nth-of-type(odd)) {
  background-color: rgba(var(--v-theme-on-surface), 0.02);
}
.bt-table :deep(tbody tr:hover) {
  background-color: rgba(var(--v-theme-primary), 0.06) !important;
}
.bt-table :deep(tbody tr.row-selected) {
  background-color: rgba(var(--v-theme-primary), 0.15) !important;
  color: rgb(var(--v-theme-primary)) !important;
}

/* ── Custom header ── */
.bt-th {
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
  position: relative;
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
}
.th-title.sortable {
  cursor: pointer;
}
.th-title.sortable:hover {
  opacity: 0.85;
}

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

.col-resize-handle {
  position: absolute;
  right: 0;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  border-right: 2px solid rgba(255, 255, 255, 0.25);
  transition: border-color 0.15s;
}
.col-resize-handle:hover,
.col-resize-handle:active {
  border-right-color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.1);
}

/* ── Empty state ── */
.bt-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  gap: 6px;
}
.bt-empty-icon {
  color: rgba(var(--v-theme-on-surface), 0.3);
  margin-bottom: 4px;
}
.bt-empty-text {
  font-size: 12px;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.5);
}

/* ── Expanded ── */
.bt-expanded-cell {
  padding: 0 !important;
  background-color: rgba(var(--v-theme-surface-variant), 0.35) !important;
}
.bt-expanded-inner {
  padding: 6px 10px;
}

/* ── Summary bar ── */
.bt-summary-sticky {
  position: sticky;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 12px;
  height: 30px;
  width: 100%;
  box-sizing: border-box;
  background: #1565c0;
  border-top: 2px solid #0d47a1;
  z-index: 2;
}
.bt-summary-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-left: auto;
}
.bt-summary-val {
  font-size: 13px;
  font-weight: 700;
  color: white;
  font-family: monospace;
}

/* ── Pagination ── */
.bt-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 2px;
  flex-shrink: 0;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.bt-page-info {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  white-space: nowrap;
}
.bt-page-controls {
  display: flex;
  align-items: center;
  gap: 3px;
}
.bt-page-btn {
  min-width: 28px;
  height: 28px;
  padding: 0 6px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 5px;
  background: rgb(var(--v-theme-surface));
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s;
}
.bt-page-btn:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.4);
  color: rgb(var(--v-theme-primary));
}
.bt-page-btn.active {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: white;
  font-weight: 700;
}
.bt-page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.bt-jump-input {
  width: 42px;
  height: 28px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 5px;
  text-align: center;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  outline: none;
  margin-left: 4px;
  -moz-appearance: textfield;
  appearance: textfield;
}
.bt-jump-input::-webkit-inner-spin-button,
.bt-jump-input::-webkit-outer-spin-button {
  -webkit-appearance: none;
}
.bt-jump-input:focus {
  border-color: rgb(var(--v-theme-primary));
}

.bt-page-of {
  font-size: 12px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  white-space: nowrap;
  margin-left: 4px;
}

.bt-per-page {
  display: flex;
  align-items: center;
  gap: 6px;
}
.bt-per-page-sel {
  height: 28px;
  padding: 0 4px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 5px;
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface));
  background: rgb(var(--v-theme-surface));
  cursor: pointer;
  outline: none;
}
.bt-per-page-sel:focus {
  border-color: rgb(var(--v-theme-primary));
}

/* suppress Vuetify sort icons */
.bt-table :deep(.v-data-table__th--sortable .v-icon) {
  display: none;
}
.bt-th :deep(.v-icon) {
  display: none !important;
}
</style>

<!-- Column Filter Dropdown — global (tidak scoped) -->
<style>
.col-filter-dropdown {
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
</style>
