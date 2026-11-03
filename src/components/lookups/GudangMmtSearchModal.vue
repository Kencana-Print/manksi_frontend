<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import {
  IconBuildingWarehouse,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<{ Kode: string; Nama: string }[]>([]);
const isLoading = ref(false);

let debounce: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await api.get("/mmt/daftar/bahan/lookup/gudang", {
      params: {
        q: search.value.trim(),
      },
    });
    items.value = res.data?.data || [];
  } catch (e) {
    console.error("Gagal memuat lookup gudang MMT:", e);
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

const onSearch = (val: string) => {
  search.value = val;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(fetchData, 300);
};

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      search.value = "";
      fetchData();
    }
  },
);

const selectItem = (item: { Kode: string; Nama: string }) => {
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconBuildingWarehouse :size="15" :stroke-width="1.7" color="white" />
        <span>Pilih Gudang Default MMT</span>
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
          placeholder="Cari kode (WH-...) atau nama gudang..."
          class="search-input"
          autofocus
        />
      </div>

      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <span>Memuat data gudang...</span>
        </div>
        <div v-else-if="items.length === 0" class="lookup-state">
          <IconDatabaseOff :size="28" :stroke-width="1.5" class="mb-2 text-grey" />
          <span>Tidak ada data gudang ditemukan</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 120px">KODE GUDANG</th>
              <th>NAMA GUDANG</th>
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
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lookup-footer">
        <span class="footer-count">Total: {{ items.length }} gudang</span>
        <button
          type="button"
          class="btn-batal"
          @click="emit('update:modelValue', false)"
        >
          Batal
        </button>
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
  min-height: 220px;
  max-height: 400px;
}
.lookup-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
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
  background: #f5f5f5;
  z-index: 1;
}
.lookup-table th {
  padding: 7px 10px;
  text-align: left;
  border-bottom: 2px solid #e0e0e0;
  font-size: 11px;
  color: #424242;
  font-weight: 700;
}
.lookup-table td {
  padding: 6px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.lookup-row {
  cursor: pointer;
}
.lookup-row:hover td {
  background: #e3f2fd;
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
  padding: 8px 14px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
}
.footer-count {
  font-size: 11px;
  color: #666;
}
.btn-batal {
  padding: 4px 12px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}
.btn-batal:hover {
  background: #f5f5f5;
}
</style>

