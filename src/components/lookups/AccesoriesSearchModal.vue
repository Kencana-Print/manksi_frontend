<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import {
  IconPaperclip,
  IconSearch,
  IconDatabaseOff,
  IconFilterOff,
} from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  sizeFilter?: string; // size baris pemanggil (kalau ada, auto-filter LABEL)
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);
const showAllOverride = ref(false); // user klik "Tampilkan Semua" -> bypass sizeFilter

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const activeSizeFilter = () =>
  showAllOverride.value ? "" : props.sizeFilter || "";

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/accesories", {
      params: {
        q: search.value,
        limit: 50,
        size: activeSizeFilter(),
      },
    });
    items.value = res.data.data.items || [];
  } catch (error) {
    console.error("Gagal memuat Lookup Aksesoris", error);
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      showAllOverride.value = false;
      fetchData();
    }
  },
);

watch(search, () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => fetchData(), 300);
});

const toggleShowAll = () => {
  showAllOverride.value = true;
  fetchData();
};

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="850px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconPaperclip :size="15" :stroke-width="1.7" color="white" />
        <span>Pilih Aksesoris</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <!-- Hint filter otomatis -->
      <div v-if="sizeFilter && !showAllOverride" class="size-filter-hint">
        <span>
          🏷️ Menampilkan LABEL untuk size <b>{{ sizeFilter }}</b> saja (sesuai
          template SPK)
        </span>
        <button class="show-all-btn" @click="toggleShowAll">
          <IconFilterOff :size="12" style="margin-right: 3px" />
          Tampilkan Semua Aksesoris
        </button>
      </div>

      <div class="lookup-search">
        <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
        <input
          v-model="search"
          type="text"
          :placeholder="
            sizeFilter && !showAllOverride
              ? `Cari dalam LABEL size ${sizeFilter}...`
              : 'Ketik kode atau nama aksesoris...'
          "
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
          <span>Mencari...</span>
        </div>
        <div v-else-if="items.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>
            {{
              sizeFilter && !showAllOverride
                ? `Tidak ada LABEL untuk size ${sizeFilter}`
                : search
                  ? "Tidak ditemukan"
                  : "Ketik untuk mencari aksesoris"
            }}
          </span>
          <button
            v-if="sizeFilter && !showAllOverride"
            class="show-all-btn"
            @click="toggleShowAll"
          >
            Coba cari di semua aksesoris
          </button>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 130px">KODE</th>
              <th>NAMA AKSESORIS</th>
              <th style="width: 130px">NOTE</th>
              <th style="width: 80px" class="text-right">SATUAN</th>
              <th style="width: 80px" class="text-right">READY</th>
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
              <td class="font-weight-bold">{{ item.Nama }}</td>
              <td>{{ item.Note }}</td>
              <td class="text-right">{{ item.Satuan }}</td>
              <td
                class="text-right"
                :class="{ 'text-red': Number(item.Ready) < 0 }"
              >
                {{ numFmt(item.Ready) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lookup-footer">
        <span class="footer-count">{{ items.length }} hasil</span>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* Gunakan style yang sama persis dengan MapSearchModal.vue */
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
.search-clear {
  background: transparent;
  border: none;
  color: #9e9e9e;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
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
  background: #1565c0;
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: white;
  border-bottom: none;
  border: 1px solid #0d47a1;
  text-align: left;
}
.lookup-table td {
  padding: 5px 10px;
  font-size: 12px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
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

.size-filter-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 12px;
  background: #fff3e0;
  border-bottom: 1px solid #ffcc80;
  font-size: 11px;
  color: #e65100;
}
.show-all-btn {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #ffb74d;
  color: #e65100;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}
.show-all-btn:hover {
  background: #ffe0b2;
}
.text-right {
  text-align: right !important;
}
.text-red {
  color: #c62828;
  font-weight: 700;
}
</style>
