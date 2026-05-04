<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";

const props = defineProps<{
  modelValue: boolean;
  cusKode?: string;
  perushKode?: string; // Tambahkan ini
  divisi?: string;
  source?: string;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

// ── State Pagination ──
const currentPage = ref(1);
const perPage = ref(50);

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/map-garmen", {
      params: {
        q: search.value,
        cus_kode: props.cusKode,
        perush_kode: props.perushKode, // Kirim filter perusahaan ke backend
        divisi: props.divisi,
        source: props.source,
      },
    });
    const allData = res.data.data.items || res.data.data || [];
    items.value = allData;
  } catch (error) {
    console.error("Gagal memuat Lookup MAP Garmen", error);
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      currentPage.value = 1; // Reset halaman saat modal dibuka
      if (items.value.length === 0) fetchData();
    }
  },
);

// Reset halaman ke-1 setiap kali user mengetik pencarian baru
watch(search, () => {
  currentPage.value = 1;
});

// 1. Data yang sudah difilter oleh pencarian
const filteredItems = computed(() => {
  if (!search.value) return items.value;
  const q = search.value.toLowerCase();
  return items.value.filter(
    (i) =>
      (i.Nomor?.toLowerCase() || "").includes(q) ||
      (i.Nama?.toLowerCase() || "").includes(q),
  );
});

// 2. Potong data yang sudah difilter berdasarkan halaman saat ini
const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  const end = start + perPage.value;
  return filteredItems.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredItems.value.length / perPage.value);
});

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};

// Navigasi
const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="800px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <v-icon size="15" color="white" class="mr-2"
          >mdi-clipboard-text-outline</v-icon
        >
        <span>Pilih MAP Garmen</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <div class="lookup-search">
        <v-icon size="16" color="#9e9e9e">mdi-magnify</v-icon>
        <input
          v-model="search"
          type="text"
          placeholder="Cari kode atau nama MAP..."
          class="search-input"
          autofocus
        />
        <button v-if="search" class="search-clear" @click="search = ''">
          ✕
        </button>
      </div>

      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="filteredItems.length === 0" class="lookup-state">
          <v-icon size="32" color="#bdbdbd">mdi-database-off-outline</v-icon>
          <span>{{
            search ? `Tidak ada hasil untuk "${search}"` : "Tidak ada data"
          }}</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 140px">NOMOR</th>
              <th>NAMA MAP</th>
              <th style="width: 100px">TANGGAL</th>
              <th style="width: 60px; text-align: right">JML</th>
              <th style="width: 120px">UKURAN</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in paginatedItems"
              :key="item.Nomor"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.Nomor }}</td>
              <td class="font-weight-bold">{{ item.Nama }}</td>
              <td>{{ item.Tanggal ? item.Tanggal.substring(0, 10) : "" }}</td>
              <td style="text-align: right">{{ item.Jumlah }}</td>
              <td>{{ item.Ukuran }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lookup-footer">
        <span class="footer-count">
          {{ filteredItems.length }} ditemukan (dari {{ items.length }} data)
        </span>

        <div v-if="totalPages > 1" class="pagination-controls">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="prevPage"
          >
            <v-icon size="14">mdi-chevron-left</v-icon>
          </button>
          <span class="page-info"
            >Hal {{ currentPage }} / {{ totalPages }}</span
          >
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="nextPage"
          >
            <v-icon size="14">mdi-chevron-right</v-icon>
          </button>
        </div>

        <span class="footer-hint">Klik baris untuk memilih</span>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* CSS bawaan Anda tetap ada di sini */
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
  letter-spacing: 0.03em;
  flex-shrink: 0;
  gap: 6px;
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
.search-clear {
  background: transparent;
  border: none;
  color: #9e9e9e;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.search-clear:hover {
  color: #424242;
}
.lookup-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 150px;
  max-height: 380px;
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
.lookup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.footer-count {
  font-size: 11px;
  color: #757575;
}
.footer-hint {
  font-size: 10px;
  color: #bdbdbd;
  font-style: italic;
}

/* ── TAMBAHAN UNTUK KONTROL PAGINATION ── */
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  color: #424242;
}
.page-btn:hover:not(:disabled) {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  font-size: 11px;
  font-weight: 600;
  color: #555;
}
</style>
