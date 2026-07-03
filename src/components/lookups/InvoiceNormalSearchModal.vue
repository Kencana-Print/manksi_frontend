<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { invTakNormalFormService as svc } from "@/services/penjualan/invoiceTakNormalFormService";
import { IconSearch, IconDatabaseOff } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  divisiGroup: "spanduk" | "garmen";
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const currentPage = ref(1);
const perPage = ref(50);
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
const num = (v: any) => Number(v || 0).toLocaleString("id-ID");

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await svc.getInvoiceNormalList(
      props.divisiGroup,
      search.value,
      currentPage.value,
      perPage.value,
    );
    items.value = res.data.data.items;
    totalItems.value = res.data.data.total;
  } catch (e) {
    console.error("Gagal memuat invoice normal:", e);
  } finally {
    isLoading.value = false;
  }
};

const onSearch = (val: string) => {
  search.value = val;
  currentPage.value = 1;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(fetchData, 400);
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

const titleLabel = computed(() =>
  props.divisiGroup === "spanduk" ? "Spanduk" : "Garmen",
);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="780px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconSearch :size="15" :stroke-width="1.7" color="white" />
        <span>Cari Invoice Normal — {{ titleLabel }}</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <div class="lookup-search">
        <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
        <input
          :value="search"
          @input="onSearch(($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Cari nomor atau nama customer..."
          class="search-input"
          autofocus
        />
      </div>

      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="items.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>{{
            search ? `Tidak ada hasil untuk "${search}"` : "Tidak ada data"
          }}</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 130px">Nomor</th>
              <th style="width: 90px">Tanggal</th>
              <th>Customer</th>
              <th style="min-width: 180px">Alamat</th>
              <th style="width: 80px">Cabang</th>
              <th style="width: 110px; text-align: right">Nominal</th>
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
              <td>{{ item.Tanggal }}</td>
              <td>{{ item.Customer }}</td>
              <td>{{ item.Alamat }}</td>
              <td>{{ item.Divisi }}</td>
              <td style="text-align: right">{{ num(item.Nominal) }}</td>
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
            class="page-btn"
            :disabled="currentPage === 1"
            @click="goToPage(1)"
          >
            «
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            ‹
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
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            ›
          </button>
          <button
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
  flex-shrink: 0;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
  padding: 0 2px;
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
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #212121;
  background: transparent;
}
.search-input::placeholder {
  color: #9e9e9e;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
}
.lookup-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9e9e9e;
  font-size: 12px;
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
  letter-spacing: 0.04em;
  color: #424242;
  border-bottom: 2px solid #e0e0e0;
  text-align: left;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
  white-space: nowrap;
}
.lookup-row {
  cursor: pointer;
  transition: background 0.1s;
}
.lookup-row:hover td {
  background: #e3f2fd;
  color: #1565c0;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
  color: #1565c0;
}
.lookup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
  gap: 8px;
}
.footer-count {
  font-size: 11px;
  color: #757575;
  white-space: nowrap;
}
.page-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}
.page-btn {
  min-width: 28px;
  height: 26px;
  padding: 0 5px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  color: #424242;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
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
  opacity: 0.3;
  cursor: default;
}
.per-page-select {
  height: 26px;
  padding: 0 4px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 11px;
  color: #424242;
  background: white;
  cursor: pointer;
  outline: none;
}
</style>
