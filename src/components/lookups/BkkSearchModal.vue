<script setup lang="ts">
import { ref, watch } from "vue";
import { pengajuanTransferFormService } from "@/services/pembelian/pengajuanTransferFormService";
import { IconReceipt2, IconSearch, IconDatabaseOff } from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);
let debounce: ReturnType<typeof setTimeout> | null = null;

const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

const fetchData = async () => {
  isLoading.value = true;
  try {
    const res = await pengajuanTransferFormService.getBkkOptions(search.value);
    items.value = res.data.data || [];
  } catch (e) {
    console.error("Gagal memuat BKK:", e);
  } finally {
    isLoading.value = false;
  }
};

const onSearch = (val: string) => {
  search.value = val;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(fetchData, 350);
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

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="680px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconReceipt2 :size="15" :stroke-width="1.7" color="white" />
        <span>F1 — Cari Nomor BKK</span>
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
          placeholder="Cari nomor, penerima, atau keterangan..."
          class="search-input"
          autofocus
        />
        <button v-if="search" class="search-clear" @click="onSearch('')">
          ✕
        </button>
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
              <th style="width: 150px">Nomor</th>
              <th style="width: 100px">Tanggal</th>
              <th>Penerima</th>
              <th style="width: 120px" class="text-right">Nominal</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in items"
              :key="item.nomor"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.nomor }}</td>
              <td>{{ item.tanggal }}</td>
              <td>{{ item.penerima || "-" }}</td>
              <td class="text-right">{{ numFmt(item.nominal) }}</td>
              <td>{{ item.keterangan || "-" }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="lookup-footer">
        <span class="footer-count">{{ items.length }} data</span>
        <button
          class="btn-batal ml-auto"
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
  max-height: 80vh;
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #00695c;
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
  min-height: 200px;
  max-height: 400px;
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
  background: #eceff1;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
  color: #00695c;
}
.lookup-footer {
  display: flex;
  align-items: center;
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
.ml-auto {
  margin-left: auto;
}
.btn-batal {
  background: transparent;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 4px 14px;
  font-size: 12px;
  cursor: pointer;
  color: #424242;
}
.btn-batal:hover {
  background: #f0f0f0;
}
</style>
