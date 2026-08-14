<script setup lang="ts">
import { ref, computed } from "vue";
import TinyPivotOnly from "@/components/TinyPivotOnly.vue";

const props = defineProps<{
  data: Record<string, unknown>[];
  filterableColumns: string[]; // kolom mana saja yang dikasih filter, mis. ["Divisi","Sales","Customer","Bulan"]
}>();

// ── State filter: { [kolom]: Set<value yang DICENTANG> } ──
const columnFilters = ref<Record<string, Set<string>>>({});
const activeFilterCol = ref<string | null>(null);
const filterSearch = ref<Record<string, string>>({});

// Nilai unik per kolom filterable, dari data MENTAH (bukan yang sudah difilter,
// biar daftar checkbox stabil walau filter lain aktif)
const uniqueValues = computed(() => {
  const result: Record<string, string[]> = {};
  for (const col of props.filterableColumns) {
    const vals = new Set<string>();
    for (const row of props.data) {
      vals.add(String(row[col] ?? ""));
    }
    result[col] = Array.from(vals).sort((a, b) =>
      a.localeCompare(b, "id", { numeric: true }),
    );
  }
  return result;
});

const filteredSearchValues = (col: string) => {
  const q = (filterSearch.value[col] || "").toLowerCase();
  const all = uniqueValues.value[col] || [];
  return q ? all.filter((v) => v.toLowerCase().includes(q)) : all;
};

const colHasActiveFilter = (col: string) => {
  const s = columnFilters.value[col];
  if (!s) return false;
  const total = uniqueValues.value[col]?.length ?? 0;
  return s.size < total; // aktif kalau ada yang di-uncheck
};

const activeFilterCount = computed(
  () => props.filterableColumns.filter((c) => colHasActiveFilter(c)).length,
);

const openFilter = (col: string) => {
  if (activeFilterCol.value === col) {
    activeFilterCol.value = null;
    return;
  }
  if (!columnFilters.value[col]) {
    columnFilters.value[col] = new Set(uniqueValues.value[col]);
  }
  activeFilterCol.value = col;
};

const toggleValue = (col: string, val: string) => {
  if (!columnFilters.value[col]) {
    columnFilters.value[col] = new Set(uniqueValues.value[col]);
  }
  const s = columnFilters.value[col];
  s.has(val) ? s.delete(val) : s.add(val);
  columnFilters.value = { ...columnFilters.value };
};

const selectAll = (col: string) => {
  columnFilters.value[col] = new Set(uniqueValues.value[col]);
  columnFilters.value = { ...columnFilters.value };
};
const hideAll = (col: string) => {
  columnFilters.value[col] = new Set();
  columnFilters.value = { ...columnFilters.value };
};
const resetAllFilters = () => {
  columnFilters.value = {};
};

// ── Data hasil filter, inilah yang dikirim ke TinyPivotOnly ──
const filteredData = computed(() => {
  let result = props.data;
  for (const [col, allowed] of Object.entries(columnFilters.value)) {
    const total = uniqueValues.value[col]?.length ?? 0;
    if (!allowed || allowed.size >= total) continue; // semua tercentang = tidak filter
    result = result.filter((row) => allowed.has(String(row[col] ?? "")));
  }
  return result;
});

const pivotRef = ref<InstanceType<typeof TinyPivotOnly> | null>(null);

const exportPivotToExcel = async () => {
  const table = pivotRef.value?.getExportTable?.();
  if (!table || !table.bodyRows.length) return null;
  return table; // dikembalikan ke parent, biar parent yang urus ExcelJS + nama file
};

defineExpose({ exportPivotToExcel });
</script>

<template>
  <div class="pivot-filter-wrap">
    <!-- ── Filter bar ── -->
    <div class="pf-bar">
      <span class="pf-lbl">Filter:</span>
      <div v-for="col in filterableColumns" :key="col" class="pf-col-btn-wrap">
        <button
          class="pf-col-btn"
          :class="{ active: colHasActiveFilter(col) }"
          @click="openFilter(col)"
        >
          {{ col }}
          <span v-if="colHasActiveFilter(col)" class="pf-dot"></span>
        </button>

        <!-- Dropdown -->
        <div v-if="activeFilterCol === col" class="pf-dropdown" @click.stop>
          <input
            v-model="filterSearch[col]"
            type="text"
            placeholder="Cari..."
            class="pf-search"
          />
          <div class="pf-actions">
            <button @click="selectAll(col)">Semua</button>
            <span>|</span>
            <button @click="hideAll(col)">Kosongkan</button>
          </div>
          <div class="pf-list">
            <label
              v-for="v in filteredSearchValues(col)"
              :key="v"
              class="pf-item"
            >
              <input
                type="checkbox"
                :checked="columnFilters[col]?.has(v) ?? true"
                @change="toggleValue(col, v)"
              />
              <span>{{ v === "" ? "(Kosong)" : v }}</span>
            </label>
          </div>
          <button class="pf-ok" @click="activeFilterCol = null">OK</button>
        </div>
      </div>

      <button
        v-if="activeFilterCount > 0"
        class="pf-reset"
        @click="resetAllFilters"
      >
        Reset Filter ({{ activeFilterCount }})
      </button>

      <span class="pf-count"
        >{{ filteredData.length }} / {{ data.length }} baris</span
      >
    </div>

    <!-- ── Pivot ── -->
    <div class="pivot-body">
      <TinyPivotOnly ref="pivotRef" :data="filteredData" />
    </div>
  </div>
</template>

<style scoped>
.pivot-filter-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.pf-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
  position: relative;
}
.pivot-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.pf-lbl {
  font-size: 11px;
  font-weight: 700;
  color: #555;
}
.pf-col-btn-wrap {
  position: relative;
}
.pf-col-btn {
  font-size: 11px;
  padding: 4px 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.pf-col-btn.active {
  border-color: #1565c0;
  color: #1565c0;
  background: #e3f2fd;
}
.pf-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #1565c0;
}
.pf-dropdown {
  position: absolute;
  top: 32px;
  left: 0;
  z-index: 50;
  background: white;
  border: 1px solid #ccc;
  border-radius: 6px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
  width: 200px;
  padding: 8px;
}
.pf-search {
  width: 100%;
  height: 26px;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  margin-bottom: 6px;
}
.pf-actions {
  display: flex;
  gap: 6px;
  font-size: 10px;
  margin-bottom: 6px;
}
.pf-actions button {
  background: none;
  border: none;
  color: #1565c0;
  cursor: pointer;
  padding: 0;
}
.pf-list {
  max-height: 180px;
  overflow-y: auto;
}
.pf-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 3px 2px;
  cursor: pointer;
}
.pf-ok {
  width: 100%;
  margin-top: 6px;
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 5px;
  font-size: 11px;
  cursor: pointer;
}
.pf-reset {
  font-size: 11px;
  padding: 4px 10px;
  border: 1px solid #f57c00;
  color: #e65100;
  background: #fff3e0;
  border-radius: 4px;
  cursor: pointer;
}
.pf-count {
  margin-left: auto;
  font-size: 11px;
  color: #757575;
}
</style>
