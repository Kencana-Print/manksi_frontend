<script setup lang="ts">
import { ref, watch } from "vue";
import {
  IconList,
  IconX,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";

interface Column {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "right" | "center";
}

const props = defineProps<{
  modelValue: boolean;
  title: string;
  columns: Column[];
  items: any[];
  loading?: boolean;
  serverSearch?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
}>();
const emit = defineEmits(["update:modelValue", "selected", "search"]);

const search = ref("");
const filteredItems = ref<any[]>([]);
let debounce: ReturnType<typeof setTimeout> | null = null;

const applyFilter = () => {
  if (props.serverSearch) {
    filteredItems.value = props.items;
    return;
  }
  if (!search.value) {
    filteredItems.value = props.items;
    return;
  }
  const q = search.value.toLowerCase();
  const keys = props.searchKeys || props.columns.map((c) => c.key);
  filteredItems.value = props.items.filter((it) =>
    keys.some((k) =>
      String(it[k] ?? "")
        .toLowerCase()
        .includes(q),
    ),
  );
};

watch(() => props.items, applyFilter, { immediate: true });

const onSearchInput = (val: string) => {
  search.value = val;
  if (props.serverSearch) {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => emit("search", val), 400);
  } else {
    applyFilter();
  }
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      applyFilter();
    }
  },
);

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="700px"
    scrollable
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconList :size="15" :stroke-width="1.7" color="white" />
        <span>{{ title }}</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          <IconX :size="15" />
        </button>
      </div>

      <div class="lookup-search">
        <IconSearch :size="15" :stroke-width="1.7" color="#9e9e9e" />
        <input
          :value="search"
          @input="onSearchInput(($event.target as HTMLInputElement).value)"
          type="text"
          :placeholder="searchPlaceholder || 'Cari...'"
          class="search-input"
          autofocus
        />
      </div>

      <div class="lookup-table-wrap">
        <div v-if="loading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="filteredItems.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>Tidak ada data</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th
                v-for="c in columns"
                :key="c.key"
                :style="{ width: c.width, textAlign: c.align || 'left' }"
              >
                {{ c.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, i) in filteredItems"
              :key="i"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td
                v-for="c in columns"
                :key="c.key"
                :style="{ textAlign: c.align || 'left' }"
              >
                {{ item[c.key] ?? "-" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.lookup-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  max-height: 88vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  gap: 6px;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
}
.lookup-close:hover {
  color: white;
}
.lookup-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  background: transparent;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
  max-height: 420px;
}
.lookup-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9e9e9e;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #f5f5f5;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #424242;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd;
}
</style>
