<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { IconPackage, IconSearch, IconDatabaseOff } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  perushKode: string;
  cusKode: string;
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

const fetchData = async () => {
  if (!props.perushKode || !props.cusKode) return;
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/barang-inv-proforma", {
      params: {
        perush: props.perushKode,
        cus: props.cusKode,
        q: search.value,
        page: currentPage.value,
        limit: perPage.value,
      },
    });
    items.value = res.data.data.items;
    totalItems.value = res.data.data.total;
  } catch (e) {
    console.error("Gagal memuat barang:", e);
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
    max-width="850px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <span class="d-flex align-center"
          ><IconPackage :size="15" :stroke-width="1.7" color="white"
        /></span>
        <span>Cari Barang / SPK</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <div class="lookup-search">
        <span class="d-flex align-center"
          ><IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e"
        /></span>
        <input
          :value="search"
          @input="onSearch(($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Cari kode atau nama barang..."
          class="search-input"
          autofocus
        />
      </div>

      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" /><span
            >Memuat data...</span
          >
        </div>
        <div v-else-if="items.length === 0" class="lookup-state">
          <span class="d-flex align-center"
            ><IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd"
          /></span>
          <span>Tidak ada data</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 140px">KODE (SPK)</th>
              <th>NAMA BARANG</th>
              <th style="width: 100px">UKURAN</th>
              <th style="width: 120px; text-align: right">HARGA</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.Kode"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.Kode }}</td>
              <td>{{ item.Nama }}</td>
              <td>{{ item.Ukuran }}</td>
              <td style="text-align: right; font-weight: 600">
                {{ Number(item.Harga).toLocaleString("id-ID") }}
              </td>
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
        </div>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* Gunakan CSS persis seperti lookup modal lainnya */
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
  flex-shrink: 0;
  gap: 6px;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
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
  background: #1565c0;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  border: 1px solid #0d47a1;
  border-bottom: none;
  text-align: left;
}
.lookup-table td {
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row:hover td {
  background: #e3f2fd;
  color: #1565c0;
  cursor: pointer;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}
.lookup-footer {
  display: flex;
  justify-content: space-between;
  padding: 7px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}
.page-btn {
  min-width: 28px;
  height: 26px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}
.page-btn.active {
  background: #1976d2;
  color: white;
  border-color: #1976d2;
}
.page-controls {
  display: flex;
  gap: 2px;
}
</style>
