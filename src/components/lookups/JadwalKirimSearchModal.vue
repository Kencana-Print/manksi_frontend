<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import {
  IconCalendarEvent,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  cusKode: string;
  perushKode: string;
  divisi: string | number;
  invPro?: string;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);
const currentPage = ref(1);
const perPage = ref(50);
const totalItems = ref(0);

import { computed } from "vue";
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
  const t = totalPages.value,
    c = currentPage.value;
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1);
  let s = Math.max(1, c - 3),
    e = Math.min(t, s + 6);
  if (e - s < 6) s = Math.max(1, e - 6);
  return Array.from({ length: e - s + 1 }, (_, i) => s + i);
});

let debounce: ReturnType<typeof setTimeout> | null = null;

const fetchData = async (page = 1) => {
  if (!props.cusKode || !props.perushKode) return;
  isLoading.value = true;
  currentPage.value = page;
  try {
    const res = await api.get("/penjualan/surat-jalan-form/jadwal-kirim", {
      params: {
        cusKode: props.cusKode,
        perushKode: props.perushKode,
        divisi: props.divisi,
        invPro: props.invPro ?? "",
        q: search.value,
        page,
        limit: perPage.value,
      },
    });
    const d = res.data.data;
    if (Array.isArray(d)) {
      items.value = d;
      totalItems.value = d.length;
    } else {
      items.value = d.items ?? [];
      totalItems.value = d.total ?? 0;
    }
  } catch {
    items.value = [];
    totalItems.value = 0;
  } finally {
    isLoading.value = false;
  }
};

const onSearch = (val: string) => {
  search.value = val;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => fetchData(1), 400);
};

const goToPage = (p: number) => {
  fetchData(Math.max(1, Math.min(p, totalPages.value)));
};

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      search.value = "";
      currentPage.value = 1;
      fetchData(1);
    }
  },
);

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};

const num = (v: any) => Number(v || 0).toLocaleString("id-ID");
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="820px"
  >
    <div class="lookup-card">
      <!-- Header -->
      <div class="lookup-header">
        <IconCalendarEvent :size="15" :stroke-width="1.7" color="white" />
        <span>Pilih dari Jadwal Kirim</span>
        <span class="lookup-sub"
          >{{ cusKode }} · {{ perushKode }} · Div {{ divisi }}</span
        >
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <!-- Search -->
      <div class="lookup-search">
        <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
        <input
          :value="search"
          @input="onSearch(($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Cari SPK, nama, no kirim..."
          class="search-input"
          autofocus
        />
        <button v-if="search" class="search-clear" @click="onSearch('')">
          ✕
        </button>
      </div>

      <!-- Warning jika customer/perusahaan belum diisi -->
      <div v-if="!cusKode || !perushKode" class="lookup-warn">
        <IconDatabaseOff :size="20" color="#e65100" />
        <span>Customer dan Perusahaan harus diisi terlebih dahulu.</span>
      </div>

      <!-- Table -->
      <div v-else class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat jadwal kirim...</span>
        </div>
        <div v-else-if="!items.length" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>{{
            search
              ? `Tidak ada hasil untuk "${search}"`
              : "Tidak ada jadwal kirim"
          }}</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 130px">SPK</th>
              <th style="min-width: 180px">Nama</th>
              <th style="width: 95px">Jadwal</th>
              <th style="width: 120px">No. Kirim</th>
              <th style="width: 50px; text-align: center">Urut</th>
              <th style="width: 80px; text-align: right">Qty Jadwal</th>
              <th>Uraian</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, i) in items"
              :key="i"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.SPK }}</td>
              <td>{{ item.Nama }}</td>
              <td>{{ item.Jadwal }}</td>
              <td class="mono" style="font-size: 11px">{{ item.NoKirim }}</td>
              <td style="text-align: center">{{ item.NoUrut }}</td>
              <td style="text-align: right">{{ num(item.QtyJadwal) }}</td>
              <td>{{ item.Uraian }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer/Pagination -->
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
        <select
          v-model="perPage"
          class="per-page-select"
          @change="fetchData(1)"
        >
          <option v-for="n in [25, 50, 100]" :key="n" :value="n">
            {{ n }}/hal
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
.lookup-sub {
  font-size: 10px;
  opacity: 0.7;
  font-weight: 400;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
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
  flex-shrink: 0;
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
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
.lookup-warn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fff3e0;
  color: #e65100;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
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
  padding: 40px;
  color: #9e9e9e;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead tr {
  position: sticky;
  top: 0;
  background: #1565c0;
  z-index: 1;
}
.lookup-table th {
  padding: 7px 8px;
  font-size: 11px;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
  white-space: nowrap;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
}
.lookup-table td {
  padding: 5px 8px;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd;
  color: #1565c0;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
  font-size: 11px;
}
.mono {
  font-family: monospace;
  font-size: 11px;
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
  background: #1565c0;
  border-color: #1565c0;
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
  background: white;
  cursor: pointer;
  outline: none;
}
</style>
