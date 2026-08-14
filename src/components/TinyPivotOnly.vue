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
      if (names.includes(v.field)) addValueField(v.field, v.agg);
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

// ── Reaktif: setiap kali konfigurasi pivot berubah (rows/cols/values
// disusun ulang user), pivotResult (dari library) ikut berubah.
// Kita TIDAK baca isi pivotResult (shape internal-nya tidak kita
// ketahui) — cukup pakai sebagai sinyal "sudah waktunya scrape ulang
// tabel HTML", setelah DOM benar-benar selesai di-render ulang. ──
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
    <div class="vpg-pivot-config-panel">
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
  min-height: 0;
  overflow: auto;
}
</style>

<style>
.vpg-collapse-toggle {
  display: none !important;
}
</style>
