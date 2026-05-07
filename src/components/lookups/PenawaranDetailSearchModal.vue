<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import {
  IconListNumbers,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean; penawaranNomor: string }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  if (!props.penawaranNomor) return;
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/penawaran-detail", {
      params: { nomor: props.penawaranNomor },
    });
    items.value = res.data.data.items || res.data.data || [];
  } catch (error) {
    console.error("Gagal memuat Detail Penawaran", error);
  } finally {
    isLoading.value = false;
  }
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

const filteredItems = computed(() => {
  if (!search.value) return items.value;
  const q = search.value.toLowerCase();
  return items.value.filter(
    (i) =>
      (i.Nama?.toLowerCase() || "").includes(q) ||
      (i.Bahan?.toLowerCase() || "").includes(q),
  );
});

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
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
        <IconListNumbers :size="15" :stroke-width="1.7" color="white" />
        <span>Pilih Detail Penawaran</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <div class="lookup-search">
        <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama barang atau bahan..."
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
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>Tidak ada data detail</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 50px">ID</th>
              <th>NAMA BARANG</th>
              <th>BAHAN</th>
              <th>UKURAN</th>
              <th>QTY</th>
              <th>HARGA</th>
              <th>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.id"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.id }}</td>
              <td>{{ item.Nama }}</td>
              <td>{{ item.Bahan }}</td>
              <td>{{ item.Ukuran }}</td>
              <td class="text-right">{{ item.Qty }} {{ item.Satuan }}</td>
              <td class="text-right">
                {{ new Intl.NumberFormat("id-ID").format(item.Harga) }}
              </td>
              <td class="text-right font-weight-bold">
                {{ new Intl.NumberFormat("id-ID").format(item.Total) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lookup-footer">
        <span class="footer-count">{{ filteredItems.length }} baris data</span>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
/* Sama dengan CSS Modal standar */
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
  background: #1565c0; /* ← ubah dari #f5f5f5 */
}
.lookup-table th {
  padding: 7px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #424242;
  text-align: left;
  white-space: nowrap;
  color: white; /* ← ubah dari #424242 */
  border-bottom: none;
  border: 1px solid #0d47a1;
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
  text-align: center;
}
.text-right {
  text-align: right;
}
.font-weight-bold {
  font-weight: bold;
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
</style>
