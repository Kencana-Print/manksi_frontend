<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { IconSearch, IconDatabaseOff, IconCash } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean; custKode: string }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const items = ref<any[]>([]);
const search = ref("");
const activeTab = ref("ALL");
const isLoading = ref(false);

// ── Pagination ──
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

const tabs = [
  { title: "Semua", value: "ALL" },
  { title: "Giro (BG)", value: "BG" },
  { title: "Cash (CS)", value: "CS" },
  { title: "Transfer (BT)", value: "BT" },
  { title: "Potongan (PT)", value: "PT" },
];

let debounce: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  if (!props.custKode) return;
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/setoran-pembayaran", {
      params: {
        cus_kode: props.custKode,
        tipe: activeTab.value,
        q: search.value,
        page: currentPage.value,
        limit: perPage.value,
      },
    });
    items.value = res.data.data || [];
    totalItems.value = res.data.total || 0;
  } catch (e) {
    console.error("Gagal memuat data setoran", e);
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

const onTabChange = (val: string) => {
  activeTab.value = val;
  currentPage.value = 1;
  fetchData();
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
      activeTab.value = "ALL";
      currentPage.value = 1;
      fetchData();
    }
  },
);

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};

const formatDate = (val: string) => {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="750px"
  >
    <div class="lookup-card">
      <!-- Header -->
      <div class="lookup-header">
        <IconCash :size="15" :stroke-width="1.7" color="white" />
        <span>Pilih Setoran Pembayaran</span>
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <!-- Search + Tabs -->
      <div class="lookup-search-wrap">
        <div class="lookup-search">
          <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
          <input
            :value="search"
            @input="onSearch(($event.target as HTMLInputElement).value)"
            type="text"
            placeholder="Cari nomor / keterangan..."
            class="search-input"
            autofocus
          />
          <button v-if="search" class="search-clear" @click="onSearch('')">
            ✕
          </button>
        </div>
        <div class="tab-wrap">
          <button
            v-for="t in tabs"
            :key="t.value"
            class="tab-btn"
            :class="{ active: activeTab === t.value }"
            @click="onTabChange(t.value)"
          >
            {{ t.title }}
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="items.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>{{
            search
              ? `Tidak ada hasil untuk "${search}"`
              : "Tidak ada data setoran"
          }}</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 160px">NO. SETORAN</th>
              <th style="width: 75px; text-align: center">JENIS</th>
              <th style="width: 100px; text-align: center">TANGGAL</th>
              <th style="width: 130px; text-align: right">NOMINAL</th>
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
              <td style="text-align: center">
                <span class="jenis-chip">{{ item.KodeBayar }}</span>
              </td>
              <td style="text-align: center">{{ formatDate(item.Tanggal) }}</td>
              <td style="text-align: right; font-weight: 600">
                {{ Number(item.Nominal).toLocaleString("id-ID") }}
              </td>
              <td class="td-truncate" :title="item.Notes">
                {{ item.Notes || "-" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer pagination -->
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
  gap: 6px;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
}
.lookup-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
}
.lookup-close:hover {
  color: white;
}

.lookup-search-wrap {
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.lookup-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
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
.search-clear {
  background: transparent;
  border: none;
  color: #9e9e9e;
  font-size: 13px;
  cursor: pointer;
}
.search-clear:hover {
  color: #424242;
}

.tab-wrap {
  display: flex;
  gap: 2px;
  padding: 6px 12px;
}
.tab-btn {
  padding: 3px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  background: white;
  font-size: 11px;
  font-weight: 600;
  color: #616161;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn:hover {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}
.tab-btn.active {
  background: #1565c0;
  border-color: #1565c0;
  color: white;
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
  color: #1565c0;
}
.td-truncate {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.jenis-chip {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  background: #e8eaf6;
  color: #3949ab;
  padding: 1px 7px;
  border-radius: 10px;
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
