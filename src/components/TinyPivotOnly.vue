<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { PivotSkeleton, usePivotTable } from "@smallwebco/tinypivot-vue";
import PivotConfig from "./PivotConfig.vue";
import "@smallwebco/tinypivot-vue/style.css";

const props = withDefaults(
  defineProps<{
    data: Record<string, unknown>[];
    theme?: "light" | "dark";
    fontSize?: "xs" | "sm" | "base";
    defaultRows?: string[];
    defaultCols?: string[];
    defaultVals?: { field: string; agg: string }[];
  }>(),
  {
    theme: "light",
    fontSize: "sm",
    defaultRows: () => [],
    defaultCols: () => [],
    defaultVals: () => [],
  },
);

const enableDrillDown = ref(true);
// Panel Field & Rumus: tertutup secara default supaya tabel mendapat ruang penuh.
const showConfig = ref(false);
const tableData = computed(() => props.data);
const {
  rowFields,
  columnFields,
  valueFields,
  showRowTotals,
  showColumnTotals,
  calculatedFields,
  availableFields,
  isConfigured,
  pivotResult,
  addRowField,
  removeRowField,
  addColumnField,
  removeColumnField,
  addValueField,
  removeValueField,
  updateValueFieldAggregation,
  clearConfig,
  addCalculatedField,
  removeCalculatedField,
  toggleCollapsedPath,
} = usePivotTable(tableData, enableDrillDown);

type AggFn = Parameters<typeof addValueField>[1];
const draggingField = ref<string | null>(null);
const totalRowCount = computed(() => props.data.length);
const filteredRowCount = computed(() => props.data.length);

let defaultConfigApplied = false;
const applyDefaultConfig = () => {
  const names = availableFields.value.map((f) => f.field);

  if (
    props.defaultRows.length ||
    props.defaultCols.length ||
    props.defaultVals.length
  ) {
    for (const f of props.defaultRows) if (names.includes(f)) addRowField(f);
    for (const f of props.defaultCols) if (names.includes(f)) addColumnField(f);
    for (const v of props.defaultVals)
      if (names.includes(v.field)) addValueField(v.field, v.agg as AggFn);
    return;
  }

  // Fallback lama (dipakai laporan lain yang belum di-set default-nya)
  if (names.includes("AccountName")) addRowField("AccountName");
  for (const col of ["Tahun", "Bulan", "Jenis"]) {
    if (names.includes(col)) addColumnField(col);
  }
  if (names.includes("Nilai")) addValueField("Nilai", "sum");
};

watch(
  () => props.data,
  (d) => {
    if (d.length && !defaultConfigApplied) {
      defaultConfigApplied = true;
      applyDefaultConfig();
    }
  },
  { immediate: true },
);

// Susunan awal (preset) berganti dari luar → kosongkan susunan lama lalu
// terapkan yang baru. Memakai API publik supaya rumus custom tidak ikut terhapus.
const kunciKonfigurasi = computed(() =>
  JSON.stringify([props.defaultRows, props.defaultCols, props.defaultVals]),
);
watch(kunciKonfigurasi, () => {
  if (!props.data.length) return;
  for (const f of [...rowFields.value]) removeRowField(f);
  for (const f of [...columnFields.value]) removeColumnField(f);
  for (const v of [...valueFields.value])
    removeValueField(v.field, v.aggregation);
  applyDefaultConfig();
});

const onAddRowField = (...args: any[]) => addRowField(args[0]);
const onRemoveRowField = (...args: any[]) => removeRowField(args[0]);
const onAddColumnField = (...args: any[]) => addColumnField(args[0]);
const onRemoveColumnField = (...args: any[]) => removeColumnField(args[0]);
const onAddValueField = (...args: any[]) => addValueField(args[0], args[1]);
const onRemoveValueField = (...args: any[]) =>
  removeValueField(args[0], args[1]);
const onUpdateAggregation = (...args: any[]) =>
  updateValueFieldAggregation(args[0], args[1], args[2]);
const onAddCalculatedField = (...args: any[]) => addCalculatedField(args[0]);
const onRemoveCalculatedField = (...args: any[]) =>
  removeCalculatedField(args[0]);
const onUpdateCalculatedField = (...args: any[]) => {
  const f = args[0] as (typeof calculatedFields.value)[number];
  calculatedFields.value = calculatedFields.value.map((x) =>
    x.id === f.id ? f : x,
  );
};
const onReorderRowFields = (...args: any[]) => {
  rowFields.value = args[0];
};
const onReorderColumnFields = (...args: any[]) => {
  columnFields.value = args[0];
};
const onToggleCollapse = (...args: any[]) => {
  toggleCollapsedPath(args[0], args[1], rowFields.value, pivotResult.value);
};

// ── Export: baca tabel HTML yang sedang dirender PivotSkeleton ──
const pivotRootEl = ref<HTMLElement | null>(null);

export interface ExportCell {
  text: string;
  colSpan: number;
  rowSpan: number;
}
export interface ExportTable {
  headerRows: ExportCell[][];
  bodyRows: ExportCell[][];
}

const getExportTable = (): ExportTable | null => {
  if (!pivotRootEl.value) return null;
  const table = pivotRootEl.value.querySelector("table");
  if (!table) return null;

  const readRow = (tr: HTMLTableRowElement): ExportCell[] =>
    Array.from(tr.children).map((cell) => ({
      text: (cell.textContent || "").trim(),
      colSpan: Number((cell as HTMLTableCellElement).colSpan) || 1,
      rowSpan: Number((cell as HTMLTableCellElement).rowSpan) || 1,
    }));

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  const headerRows = thead
    ? Array.from(thead.querySelectorAll("tr")).map((tr) =>
        readRow(tr as HTMLTableRowElement),
      )
    : [];
  const bodyRows = tbody
    ? Array.from(tbody.querySelectorAll("tr")).map((tr) =>
        readRow(tr as HTMLTableRowElement),
      )
    : [];

  return { headerRows, bodyRows };
};

const emit = defineEmits<{
  (e: "pivot-changed", table: ExportTable | null): void;
}>();

// Setiap kali konfigurasi pivot berubah, pivotResult ikut berubah. Dipakai
// sebagai sinyal untuk scrape ulang tabel HTML setelah DOM selesai dirender.
watch(
  pivotResult,
  async () => {
    await nextTick();
    emit("pivot-changed", getExportTable());
  },
  { deep: true },
);

defineExpose({ getExportTable, rowFields, columnFields, valueFields });
</script>

<template>
  <div class="vpg-pivot-container" ref="pivotRootEl">
    <div class="pc-rail">
      <button
        type="button"
        class="pc-rail-btn"
        :title="
          showConfig
            ? 'Sembunyikan panel field'
            : 'Tampilkan daftar field, rumus custom, dan total'
        "
        @click="showConfig = !showConfig"
      >
        <span>{{ showConfig ? "◀" : "▶" }}</span>
        <span class="pc-rail-lbl">Field &amp; Rumus</span>
      </button>
      <div v-show="showConfig" class="vpg-pivot-config-panel">
        <PivotConfig
          :available-fields="availableFields"
          :row-fields="rowFields"
          :column-fields="columnFields"
          :value-fields="valueFields"
          :show-row-totals="showRowTotals"
          :show-column-totals="showColumnTotals"
          :calculated-fields="calculatedFields"
          :theme="theme"
          @update:show-row-totals="showRowTotals = $event"
          @update:show-column-totals="showColumnTotals = $event"
          @clear-config="clearConfig"
          @drag-start="draggingField = $event"
          @drag-end="draggingField = null"
          @update-aggregation="onUpdateAggregation"
          @add-row-field="onAddRowField"
          @remove-row-field="onRemoveRowField"
          @add-column-field="onAddColumnField"
          @remove-column-field="onRemoveColumnField"
          @add-value-field="onAddValueField"
          @remove-value-field="onRemoveValueField"
          @add-calculated-field="onAddCalculatedField"
          @remove-calculated-field="onRemoveCalculatedField"
          @update-calculated-field="onUpdateCalculatedField"
        />
      </div>
    </div>
    <div class="vpg-pivot-main">
      <PivotSkeleton
        :row-fields="rowFields"
        :column-fields="columnFields"
        :value-fields="valueFields"
        :calculated-fields="calculatedFields"
        :is-configured="isConfigured"
        :dragging-field="draggingField"
        :pivot-result="pivotResult"
        :font-size="fontSize"
        :active-filters="null"
        :total-row-count="totalRowCount"
        :filtered-row-count="filteredRowCount"
        :theme="theme"
        :enable-drill-down="enableDrillDown"
        :enable-drill-through="false"
        pivot-layout="grouped"
        @add-row-field="onAddRowField"
        @remove-row-field="onRemoveRowField"
        @add-column-field="onAddColumnField"
        @remove-column-field="onRemoveColumnField"
        @add-value-field="onAddValueField"
        @remove-value-field="onRemoveValueField"
        @update-aggregation="onUpdateAggregation"
        @reorder-row-fields="onReorderRowFields"
        @reorder-column-fields="onReorderColumnFields"
        @toggle-collapse="onToggleCollapse"
      />
    </div>
  </div>
</template>

<style scoped>
.vpg-pivot-container {
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.pc-rail {
  display: flex;
  flex-shrink: 0;
  height: 100%;
  min-height: 0;
  border-right: 1px solid #cfd8dc;
}
.pc-rail-btn {
  width: 22px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border: none;
  background: #eceff1;
  color: #455a64;
  font-size: 10.5px;
  cursor: pointer;
}
.pc-rail-btn:hover {
  background: #e1e7eb;
}
.pc-rail-lbl {
  writing-mode: vertical-rl;
  letter-spacing: 0.03em;
}
.vpg-pivot-config-panel {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.vpg-pivot-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
</style>

<style>
.vpg-collapse-toggle {
  display: none !important;
}

/* Judul "Pivot Table" + penghitung + tombol S/M/L: tidak dipakai, memakan tinggi */
.vpg-pivot-container .vpg-skeleton-header {
  display: none !important;
}
.vpg-pivot-container .vpg-config-bar {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

/* Tampilan tabel pivot ala MANKSI desktop: kompak, bergaris, Grand Total abu */
.vpg-pivot-container .vpg-pivot-skeleton {
  border: none;
  border-radius: 0;
  box-shadow: none;
}
.vpg-pivot-container .vpg-pivot-table {
  font-variant-numeric: tabular-nums;
}
.vpg-pivot-container .vpg-pivot-table th,
.vpg-pivot-container .vpg-pivot-table td {
  padding: 2px 6px !important;
  line-height: 1.3 !important;
  font-size: 12px !important;
  border: 1px solid #8a8a8a !important;
}
.vpg-pivot-container .vpg-column-header-cell,
.vpg-pivot-container .vpg-row-header-label {
  background: #e9e9e9 !important;
  color: #000 !important;
  font-weight: 600 !important;
  text-transform: none !important;
}
.vpg-pivot-container .vpg-row-header-cell {
  background: #f3f3f3 !important;
  color: #000 !important;
  font-weight: 500 !important;
  vertical-align: top;
}
.vpg-pivot-container .vpg-data-cell {
  text-align: right;
}
.vpg-pivot-container .vpg-total-cell,
.vpg-pivot-container .vpg-grand-total-cell,
.vpg-pivot-container .vpg-total-header,
.vpg-pivot-container .vpg-total-label {
  background: #e2e2e2 !important;
  color: #000 !important;
  font-weight: 700 !important;
}
</style>
