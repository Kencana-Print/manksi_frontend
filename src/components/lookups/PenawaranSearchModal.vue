<script setup lang="ts">
import { ref, computed, watch } from "vue";
import api from "@/services/api";

const props = defineProps<{ modelValue: boolean; custKode?: string }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const total = ref(0);
const isLoading = ref(false);
const currentPage = ref(1);
const perPage = 50;

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / perPage)),
);

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/penawaran", {
      params: {
        q: search.value,
        custKode: props.custKode || "",
        page: currentPage.value,
        limit: perPage,
      },
    });
    const d = res.data.data;
    items.value = d.items || d || [];
    total.value = d.total ?? items.value.length;
  } catch (err) {
    console.error("Gagal memuat Penawaran", err);
    items.value = [];
    total.value = 0;
  } finally {
    isLoading.value = false;
  }
};

// Re-fetch saat search berubah (debounce ringan via watch)
let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    currentPage.value = 1;
    fetchData();
  }, 300);
});

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

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    fetchData();
  }
};
const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    fetchData();
  }
};

const selectItem = (item: any) => {
  emit("selected", {
    Nomor: item.pen_nomor || item.Nomor,
    Tanggal: item.pen_tanggal || item.Tanggal,
    Customer: item.cus_nama || item.Customer,
    CusKode: item.pen_cus_kode || item.CusKode,
  });
  emit("update:modelValue", false);
};

const close = () => emit("update:modelValue", false);
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="close"
    max-width="700px"
  >
    <div class="lkp-card">
      <!-- Header -->
      <div class="lkp-header">
        <v-icon size="14" color="white" class="mr-2"
          >mdi-file-document-outline</v-icon
        >
        <span>Pilih Surat Penawaran</span>
        <button class="lkp-close" @click="close">✕</button>
      </div>

      <!-- Search -->
      <div class="lkp-search">
        <v-icon size="16" color="#9e9e9e">mdi-magnify</v-icon>
        <input
          v-model="search"
          type="text"
          placeholder="Cari nomor penawaran atau customer..."
          class="lkp-search-input"
          autofocus
        />
        <button v-if="search" class="lkp-clear" @click="search = ''">✕</button>
      </div>

      <!-- Tabel -->
      <div class="lkp-table-wrap">
        <!-- Loading -->
        <div v-if="isLoading" class="lkp-state">
          <v-progress-circular
            indeterminate
            color="primary"
            size="24"
            width="2"
          />
          <span>Memuat data...</span>
        </div>

        <!-- Empty -->
        <div v-else-if="items.length === 0" class="lkp-state">
          <v-icon size="32" color="#bdbdbd">mdi-database-off-outline</v-icon>
          <span>{{
            search ? `Tidak ada hasil untuk "${search}"` : "Tidak ada data"
          }}</span>
        </div>

        <!-- Data -->
        <table v-else class="lkp-table">
          <thead>
            <tr>
              <th style="width: 150px">Nomor</th>
              <th style="width: 110px">Tanggal</th>
              <th>Customer</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.pen_nomor || item.Nomor"
              class="lkp-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.pen_nomor || item.Nomor }}</td>
              <td>{{ item.pen_tanggal || item.Tanggal }}</td>
              <td>{{ item.cus_nama || item.Customer }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="lkp-footer">
        <span class="footer-count">{{ total }} data</span>

        <div v-if="totalPages > 1" class="page-ctrl">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="prevPage"
          >
            <v-icon size="13">mdi-chevron-left</v-icon>
          </button>
          <span class="page-txt">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="nextPage"
          >
            <v-icon size="13">mdi-chevron-right</v-icon>
          </button>
        </div>

        <span class="footer-hint">Klik baris untuk memilih</span>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.lkp-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: "Segoe UI", system-ui, sans-serif;
  font-size: 12px;
  max-height: 88vh;
}

/* ── Header ── */
.lkp-header {
  display: flex;
  align-items: center;
  background: #1565c0;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  gap: 4px;
}
.lkp-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 15px;
  cursor: pointer;
  padding: 0 2px;
}
.lkp-close:hover {
  color: white;
}

/* ── Search ── */
.lkp-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
}
.lkp-search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 13px;
  color: #212121;
  background: transparent;
}
.lkp-search-input::placeholder {
  color: #9e9e9e;
}
.lkp-clear {
  background: transparent;
  border: none;
  color: #9e9e9e;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}
.lkp-clear:hover {
  color: #424242;
}

/* ── Table ── */
.lkp-table-wrap {
  flex: 1;
  overflow-y: auto;
  min-height: 150px;
  max-height: 400px;
}
.lkp-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9e9e9e;
  font-size: 12px;
}
.lkp-table {
  width: 100%;
  border-collapse: collapse;
}
.lkp-table thead tr {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1565c0;
}
.lkp-table th {
  padding: 6px 10px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: white;
  border: 1px solid #0d47a1;
  text-align: left;
  white-space: nowrap;
}
.lkp-table td {
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
  white-space: nowrap;
}
.lkp-row {
  cursor: pointer;
  transition: background 0.1s;
}
.lkp-row:hover td {
  background: #e3f2fd;
  color: #1565c0;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  color: #1565c0;
}

/* ── Footer ── */
.lkp-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
  flex-shrink: 0;
  gap: 8px;
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

.page-ctrl {
  display: flex;
  align-items: center;
  gap: 6px;
}
.page-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  color: #424242;
}
.page-btn:hover:not(:disabled) {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.page-txt {
  font-size: 11px;
  font-weight: 600;
  color: #555;
  white-space: nowrap;
}
</style>
