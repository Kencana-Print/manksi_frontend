<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import {
  IconListNumbers,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";

const props = defineProps<{ modelValue: boolean; mkbNomor: string }>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  if (!props.mkbNomor) return;
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/mkb-detail", {
      params: { nomor: props.mkbNomor },
    });

    // --- CEK WARNING DARI BACKEND SEPERTI DELPHI ---
    const warningMsg = res.data.data.warning;
    if (warningMsg) {
      // confirm() akan menghentikan eksekusi sampai user milih OK/Cancel
      if (!window.confirm(warningMsg)) {
        // Jika user pilih Cancel (No), tutup modal detail dan batalkan load
        emit("update:modelValue", false);
        return;
      }
    }

    items.value = res.data.data.items || [];
  } catch (e) {
    console.error("Gagal memuat Detail MKB", e);
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
      (i.Kode?.toLowerCase() || "").includes(q),
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
    max-width="700px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconListNumbers :size="15" color="white" />
        <span>Pilih Detail MKB - {{ mkbNomor }}</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>
      <div class="lookup-search">
        <IconSearch :size="16" color="#9e9e9e" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari kode atau nama bahan..."
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
          <IconDatabaseOff :size="32" color="#bdbdbd" />
          <span>Tidak ada data detail MKB</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 50px">No</th>
              <th style="width: 120px">Kode</th>
              <th>Nama Bahan</th>
              <th style="width: 70px">Satuan</th>
              <th style="width: 100px">Komponen</th>
              <th style="width: 80px" class="text-right">Jumlah PO</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.No"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="text-center">{{ item.No }}</td>
              <td class="td-kode">{{ item.Kode }}</td>
              <td>{{ item.Nama }}</td>
              <td class="text-center">{{ item.Satuan }}</td>
              <td>{{ item.Komponen }}</td>
              <td class="text-right">
                {{ Number(item.Jumlah).toLocaleString("id-ID") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="lookup-footer">
        <span class="footer-count">{{ filteredItems.length }} baris</span>
        <span class="footer-hint">Klik baris untuk memilih</span>
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
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: white;
  border: 1px solid #0d47a1;
  text-align: left;
  white-space: nowrap;
}
.lookup-table td {
  padding: 5px 10px;
  font-size: 12px;
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
}
.text-right {
  text-align: right;
}
.text-center {
  text-align: center;
}
.lookup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px solid #e0e0e0;
  background: #fafafa;
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
</style>
