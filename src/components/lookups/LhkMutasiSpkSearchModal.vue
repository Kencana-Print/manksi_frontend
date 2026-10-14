<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import {
  IconClipboardSearch,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";
import * as mpsForm from "@/services/spanduk/mutasiProduksiSpandukFormService";
import type { SpkDiLhk } from "@/services/spanduk/mutasiProduksiSpandukFormService";

const props = defineProps<{
  modelValue: boolean;
  lini: string;
  lhk: string;
}>();
const emit = defineEmits<{
  (e: "update:modelValue", v: boolean): void;
  (e: "selected", item: SpkDiLhk): void;
}>();

const toast = useToast();
const search = ref("");
const items = ref<SpkDiLhk[]>([]);
const isLoading = ref(false);

// Daftar per LHK pendek, jadi disaring di sisi klien
const tampil = computed(() => {
  const k = search.value.trim().toUpperCase();
  if (!k) {
    return items.value;
  }
  return items.value.filter(
    (r) =>
      r.Nomor_SPK.toUpperCase().includes(k) ||
      (r.Nama_SPK ?? "").toUpperCase().includes(k),
  );
});

const fetchData = async () => {
  isLoading.value = true;
  try {
    items.value = await mpsForm.getSpkDiLhk(props.lini, props.lhk);
  } catch (e) {
    toast.error(mpsForm.pesanError(e, "Gagal memuat daftar SPK/MAP."));
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
      fetchData();
    }
  },
);

const selectItem = (item: SpkDiLhk) => {
  if (item.Sudah_Dimutasi) {
    toast.warning(`Sudah dimutasi (${item.Nomor_Mutasi}).`);
    return;
  }
  emit("selected", item);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="760px"
  >
    <div class="lookup-card">
      <div class="lookup-header">
        <IconClipboardSearch :size="15" :stroke-width="1.7" color="white" />
        <span>SPK/MAP di LHK {{ lhk }}</span>
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
          placeholder="Cari nomor atau nama SPK/MAP..."
          class="search-input"
          autofocus
        />
      </div>

      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="tampil.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>Tidak ada SPK/MAP</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 140px">NOMOR</th>
              <th>NAMA</th>
              <th style="width: 60px">JENIS</th>
              <th style="width: 90px; text-align: right">JML ORDER</th>
              <th style="width: 170px">STATUS MUTASI</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in tampil"
              :key="item.Nomor_SPK"
              class="lookup-row"
              :class="{ 'row-done': item.Sudah_Dimutasi }"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.Nomor_SPK }}</td>
              <td>{{ item.Nama_SPK }}</td>
              <td>{{ item.Jenis_Sumber }}</td>
              <td style="text-align: right">
                {{ Number(item.Jumlah_Order ?? 0).toLocaleString("id-ID") }}
              </td>
              <td>
                {{
                  item.Sudah_Dimutasi ? `Sudah (${item.Nomor_Mutasi})` : "Belum"
                }}
              </td>
            </tr>
          </tbody>
        </table>
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
.row-done td {
  color: #9e9e9e;
  cursor: not-allowed;
}
.row-done:hover td {
  background: #fafafa;
  color: #9e9e9e;
}
.td-kode {
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
  color: #1565c0;
}
</style>
