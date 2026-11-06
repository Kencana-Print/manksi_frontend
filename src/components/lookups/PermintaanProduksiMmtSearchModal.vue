<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";
import {
  IconClipboardList,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";

interface PermintaanItem {
  Nomor: string;
  Tanggal: string;
  Lokasi: string;
  Keterangan: string;
  Status: string;
  Tipe: string;
}

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void;
  (e: "selected", item: PermintaanItem): void;
}>();

const search = ref("");
const items = ref<PermintaanItem[]>([]);
const isLoading = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  isLoading.value = true;
  try {
    const q = search.value.trim();
    const res = await api.get(
      "/mmt/bahan-baku-produksi/permintaan-produksi/lookup",
      {
        params: { q },
      },
    );
    items.value = res.data?.data || [];
  } catch (err) {
    console.error("Gagal memuat dokumen permintaan produksi:", err);
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

const onSearchInput = (val: string) => {
  search.value = val;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchData, 300);
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

const selectItem = (item: PermintaanItem) => {
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="920px"
  >
    <div class="lookup-card">
      <!-- Header Dialog -->
      <div class="lookup-header">
        <IconClipboardList :size="16" :stroke-width="1.8" color="white" />
        <span>Pilih Dokumen Permintaan Produksi</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <!-- Search Bar -->
      <div class="lookup-search">
        <div class="search-input-wrap">
          <IconSearch :size="14" class="search-icon" />
          <input
            type="text"
            :value="search"
            @input="onSearchInput(($event.target as HTMLInputElement).value)"
            placeholder="Ketik Nomor Dokumen (MNT / MIN) atau keterangan..."
            class="search-field"
            autofocus
          />
        </div>
      </div>

      <!-- Tabel Data -->
      <div class="lookup-body">
        <div v-if="isLoading" class="lookup-loading">
          <v-progress-circular indeterminate size="22" width="2" />
          <span>Memuat daftar dokumen permintaan...</span>
        </div>

        <div v-else-if="items.length === 0" class="lookup-empty">
          <IconDatabaseOff :size="28" :stroke-width="1.3" />
          <span>Tidak ada dokumen permintaan produksi ditemukan.</span>
        </div>

        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 40px" class="text-center">No</th>
              <th style="width: 170px">No. Permintaan</th>
              <th style="width: 110px" class="text-center">Tanggal</th>
              <th style="width: 130px">Lokasi / Dept</th>
              <th>Keterangan</th>
              <th style="width: 80px" class="text-center">Tipe</th>
              <th style="width: 65px" class="text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(it, idx) in items"
              :key="it.Nomor || idx"
              class="lookup-row"
              @dblclick="selectItem(it)"
            >
              <td class="text-center text-muted">{{ idx + 1 }}</td>
              <td>
                <span class="font-monospace font-weight-bold text-primary">
                  {{ it.Nomor }}
                </span>
              </td>
              <td class="text-center">{{ formatTanggal(it.Tanggal) }}</td>
              <td>
                <span class="font-weight-medium text-dark">
                  {{ it.Lokasi || "-" }}
                </span>
              </td>
              <td>
                <span class="text-truncate-2" :title="it.Keterangan">
                  {{ it.Keterangan || "-" }}
                </span>
              </td>
              <td class="text-center">
                <span
                  class="badge-type"
                  :class="it.Tipe === 'SUBLIM' ? 'badge-sublim' : 'badge-mmt'"
                >
                  {{ it.Tipe || "MMT" }}
                </span>
              </td>
              <td class="text-center">
                <button
                  type="button"
                  class="btn-select"
                  @click="selectItem(it)"
                >
                  Pilih
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer Info -->
      <div class="lookup-footer">
        <span class="text-muted text-caption">
          Ditemukan {{ items.length }} dokumen permintaan. Klik ganda pada baris
          untuk memilih cepat.
        </span>
        <button
          type="button"
          class="btn-cancel"
          @click="emit('update:modelValue', false)"
        >
          Tutup
        </button>
      </div>
    </div>
  </v-dialog>
</template>

<style scoped>
.lookup-card {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.lookup-header {
  background: #1e293b;
  color: #ffffff;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.lookup-close {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  line-height: 1;
}

.lookup-close:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.lookup-search {
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 10px;
  color: #94a3b8;
  pointer-events: none;
}

.search-field {
  width: 100%;
  padding: 7px 10px 7px 32px;
  font-size: 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  outline: none;
  background: #ffffff;
  color: #1e293b;
  transition: border-color 0.15s ease;
}

.search-field:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.lookup-body {
  flex: 1;
  overflow-y: auto;
  min-height: 320px;
  max-height: 480px;
}

.lookup-loading,
.lookup-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 12px;
}

.lookup-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.lookup-table th {
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 2;
}

.lookup-table td {
  padding: 7px 10px;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
  vertical-align: middle;
}

.lookup-row:hover {
  background: #f8fafc;
  cursor: pointer;
}

.font-monospace {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;
}

.badge-type {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.badge-mmt {
  background: #e0f2fe;
  color: #0369a1;
}

.badge-sublim {
  background: #fef3c7;
  color: #b45309;
}

.btn-select {
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-select:hover {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.lookup-footer {
  padding: 8px 14px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn-cancel {
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: #f1f5f9;
}

.text-truncate-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
