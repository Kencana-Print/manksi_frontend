<script setup lang="ts">
import { toRef } from "vue";
import { watch } from "vue";
import {
  useColumnFilter,
  type DetailHeader,
} from "@/composables/useColumnFilter";
import {
  IconFilter,
  IconAdjustmentsHorizontal,
  IconFilterOff,
} from "@tabler/icons-vue";

const props = defineProps<{
  headers: DetailHeader[];
  items: Record<string, any>[];
  itemKey?: string;
}>();

const emit = defineEmits<{
  (e: "update:filteredItems", items: Record<string, any>[]): void;
}>();

const itemsRef = toRef(props, "items");
const {
  activeFilterCol,
  filterDropdownStyle,
  colFilterSearch,
  uniqueValuesPerCol,
  filteredUniqueVals,
  colHasFilter,
  activeFilterCount,
  columnFilters,
  toggleColFilter,
  onColSearchInput,
  selectAllCol,
  hideAllCol,
  openColFilter,
  closeColFilter,
  resetAllFilters,
  filteredItems,
} = useColumnFilter(itemsRef, props.headers);

const onWrapClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest(".dft-dropdown") && !target.closest(".dft-filter-btn")) {
    closeColFilter();
  }
};

watch(filteredItems, (val) => emit("update:filteredItems", val), {
  immediate: true,
});
</script>

<template>
  <div class="dft-wrap" @click="onWrapClick">
    <div v-if="activeFilterCount > 0" class="dft-reset-row">
      <button class="dft-reset-btn" @click="resetAllFilters">
        <IconFilterOff :size="11" /> Reset Filter ({{ activeFilterCount }})
      </button>
    </div>
    <table class="dft-table">
      <thead>
        <tr>
          <th
            v-for="h in headers"
            :key="h.key"
            :style="{ width: h.width }"
            :class="h.align ? `text-${h.align}` : ''"
          >
            <div class="dft-th-inner">
              <span class="dft-th-title">{{ h.title }}</span>
              <button
                class="dft-filter-btn"
                :class="{ active: colHasFilter(h.key) }"
                @click.stop="openColFilter(h.key, $event)"
              >
                <IconFilter
                  v-if="colHasFilter(h.key)"
                  :size="9"
                  :stroke-width="2"
                />
                <IconAdjustmentsHorizontal v-else :size="9" :stroke-width="2" />
              </button>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, idx) in filteredItems"
          :key="itemKey ? item[itemKey] : idx"
        >
          <td
            v-for="h in headers"
            :key="h.key"
            :class="h.align ? `text-${h.align}` : ''"
          >
            <slot :name="`item.${h.key}`" :item="item">{{ item[h.key] }}</slot>
          </td>
        </tr>
        <tr v-if="filteredItems.length === 0">
          <td :colspan="headers.length" class="dft-empty">Tidak ada data.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <Teleport to="body">
    <div
      v-if="activeFilterCol"
      class="dft-dropdown"
      :style="filterDropdownStyle"
      @click.stop
    >
      <input
        :value="colFilterSearch[activeFilterCol]"
        @input="
          onColSearchInput(
            activeFilterCol,
            ($event.target as HTMLInputElement).value,
          )
        "
        type="text"
        placeholder="Cari..."
        class="dft-search-input"
        @click.stop
      />
      <div class="dft-search-hint">
        {{ filteredUniqueVals(activeFilterCol).length }} dari
        {{ uniqueValuesPerCol[activeFilterCol]?.length ?? 0 }} nilai ditampilkan
      </div>
      <div class="dft-actions">
        <button class="dft-action-btn" @click="selectAllCol(activeFilterCol)">
          Tampilkan Semua
        </button>
        <span class="dft-sep">|</span>
        <button
          class="dft-action-btn dft-error"
          @click="hideAllCol(activeFilterCol)"
        >
          Sembunyikan Semua
        </button>
      </div>
      <div class="dft-divider" />
      <div class="dft-list">
        <label
          v-for="val in filteredUniqueVals(activeFilterCol)"
          :key="val"
          class="dft-item"
        >
          <input
            type="checkbox"
            :checked="columnFilters[activeFilterCol]?.has(val) ?? true"
            @change="toggleColFilter(activeFilterCol, val)"
          />
          <span class="dft-val">{{ val === "" ? "(Kosong)" : val }}</span>
        </label>
        <div
          v-if="filteredUniqueVals(activeFilterCol).length === 0"
          class="dft-empty-list"
        >
          Tidak ada hasil
        </div>
      </div>
      <div class="dft-footer">
        <button class="dft-ok-btn" @click="closeColFilter">OK</button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.dft-wrap {
  font-size: 11px;
}
.dft-reset-row {
  padding: 4px 0;
}
.dft-reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #fff3e0;
  color: #e65100;
  border: 1px solid #ffcc80;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 10px;
  cursor: pointer;
}
.dft-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}
.dft-table th {
  background: #546e7a;
  color: white;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 0 6px;
  height: 30px;
  white-space: nowrap;
  position: relative;
}
.dft-th-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
}
.dft-filter-btn {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 3px;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.dft-filter-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}
.dft-filter-btn.active {
  background: #ffd54f;
  border-color: #ffd54f;
  color: #1a1a1a;
}
.dft-table td {
  padding: 3px 7px;
  height: 26px;
  border-bottom: 1px solid #eee;
  font-size: 11px;
}
.dft-table tbody tr:nth-of-type(even) td {
  background: rgba(0, 0, 0, 0.02);
}
.dft-table tbody tr:hover td {
  background: rgba(21, 101, 192, 0.06);
}
.dft-empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 10px;
}
.text-right {
  text-align: right !important;
}
.text-center {
  text-align: center !important;
}

.dft-dropdown {
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  width: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-size: 12px;
}
.dft-search-input {
  margin: 8px 8px 4px;
  width: calc(100% - 16px);
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.dft-search-hint {
  font-size: 10px;
  color: #888;
  padding: 2px 8px 4px;
}
.dft-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}
.dft-action-btn {
  background: none;
  border: none;
  font-size: 11px;
  color: #1565c0;
  cursor: pointer;
}
.dft-action-btn:hover {
  text-decoration: underline;
}
.dft-action-btn.dft-error {
  color: #c62828;
}
.dft-sep {
  color: #ddd;
  font-size: 11px;
}
.dft-divider {
  height: 1px;
  background: #eee;
}
.dft-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 4px 0;
}
.dft-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  cursor: pointer;
}
.dft-item:hover {
  background: rgba(0, 0, 0, 0.06);
}
.dft-empty-list {
  padding: 8px 10px;
  font-size: 11px;
  color: #aaa;
  text-align: center;
}
.dft-footer {
  padding: 6px 8px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
}
.dft-ok-btn {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 16px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
</style>
