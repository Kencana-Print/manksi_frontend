<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import {
  IconFileInvoice,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  jenis: string;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const currentPage = ref(1);
const perPage = ref(25);
const totalItems = ref(0);
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
  const total = totalPages.value,
    cur = currentPage.value;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, cur - 2);
  let end = Math.min(total, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

let debounce: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  if (!props.jenis) return;
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/permintaan-beli-garmen", {
      params: {
        q: search.value,
        jenis: props.jenis,
        page: currentPage.value,
        limit: perPage.value,
      },
    });
    items.value = res.data.data.items || [];
    totalItems.value = res.data.data.total || res.data.data.items?.length || 0;
  } catch (e) {
    console.error("Gagal memuat permintaan pembelian garmen:", e);
  } finally {
    isLoading.value = false;
  }
};

const onSearch = (val: string) => {
  search.value = val;
  currentPage.value = 1;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(fetchData, 500);
};

const goToPage = (p: number) => {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value));
  fetchData();
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      currentPage.value = 1;
      fetchData();
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
    max-width="900px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <span class="d-flex align-center">
          <IconFileInvoice :size="15" :stroke-width="1.7" color="white" />
        </span>
        <span>Cari Permintaan {{ props.jenis }}</span>
        <v-spacer />
        <button
          type="button"
          class="lookup-close"
          @click="emit('update:modelValue', false)"
        >
          ✕
        </button>
      </div>

      <div class="lookup-search">
        <span class="d-flex align-center">
          <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
        </span>
        <input
          :value="search"
          @input="onSearch(($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Cari Nomor Minta atau Keterangan..."
          class="search-input"
          autofocus
        />
        <button
          v-if="search"
          type="button"
          class="search-clear"
          @click="onSearch('')"
        >
          ✕
        </button>
      </div>

      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="items.length === 0" class="lookup-state">
          <span class="d-flex align-center">
            <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          </span>
          <span>{{
            search
              ? `Tidak ada hasil untuk "${search}"`
              : "Tidak ada data permintaan terbuka"
          }}</span>
        </div>

        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 160px">NOMOR MINTA</th>
              <th style="width: 110px" class="text-center">TANGGAL</th>
              <th style="width: 130px">JENIS</th>
              <th>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.Nomor"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.Nomor }}</td>
              <td class="text-center">{{ item.Tanggal }}</td>
              <td>{{ item.Jenis }}</td>
              <td class="truncate">{{ item.Keterangan || "-" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lookup-footer">
        <span class="footer-count"
          >{{ pageStart }}–{{ pageEnd }} dari {{ totalItems }} data</span
        >
        <div class="page-controls">
          <button
            type="button"
            class="page-btn"
            :disabled="currentPage === 1"
            @click="goToPage(1)"
          >
            «
          </button>
          <button
            type="button"
            class="page-btn"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            ‹
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            type="button"
            class="page-btn"
            :class="{ active: p === currentPage }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button
            type="button"
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            ›
          </button>
          <button
            type="button"
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="goToPage(totalPages)"
          >
            »
          </button>
        </div>
        <select v-model="perPage" class="per-page-select" @change="goToPage(1)">
          <option v-for="n in [25, 50, 100]" :key="n" :value="n">
            {{ n }} / hal
          </option>
        </select>
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
  max-height: 85vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  gap: 6px;
  height: 34px;
  box-sizing: border-box;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  outline: none;
}
.lookup-close:hover {
  color: white;
}
.lookup-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
  height: 36px;
  box-sizing: border-box;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 12px;
  color: #212121;
  background: transparent;
}
.search-input::placeholder {
  color: #9e9e9e;
}
.search-clear {
  background: transparent;
  border: none;
  color: #9e9e9e;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  outline: none;
}
.search-clear:hover {
  color: #424242;
}
.lookup-table-wrap {
  flex: 1;
  overflow: auto;
  min-height: 250px;
}
.lookup-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 50px 16px;
  color: #9e9e9e;
  font-size: 12px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.lookup-table thead tr th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1565c0 !important;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: white;
  border: 1px solid #0d47a1;
  text-align: left;
  white-space: nowrap;
  height: 32px;
}
.lookup-table tbody td {
  padding: 4px 10px;
  font-size: 12px;
  border-bottom: 1px solid #e0e0e0;
  color: #212121;
  white-space: nowrap;
  height: 28px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd !important;
  color: #1565c0;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}
.lookup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
  gap: 8px;
  height: 36px;
  box-sizing: border-box;
}
.footer-count {
  font-size: 11px;
  color: #757575;
}
.page-controls {
  display: flex;
  align-items: center;
  gap: 3px;
}
.page-btn {
  min-width: 26px;
  height: 24px;
  padding: 0 4px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  background: white;
  font-size: 11px;
  color: #424242;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
}
.page-btn:hover:not(:disabled) {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}
.page-btn.active {
  background: #1976d2;
  border-color: #1976d2;
  color: white;
  font-weight: 700;
}
.page-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.per-page-select {
  height: 24px;
  padding: 0 4px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
  font-size: 11px;
  color: #424242;
  background: white;
  cursor: pointer;
  outline: none;
}
.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
