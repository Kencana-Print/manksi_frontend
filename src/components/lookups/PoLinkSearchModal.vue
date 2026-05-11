<script setup lang="ts">
import { ref, watch } from "vue";
import api from "@/services/api";
import { IconLink, IconSearch } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  kodeBahan: string;
  mkbNomor: string;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const fetchData = async () => {
  if (!props.kodeBahan) return;
  isLoading.value = true;
  try {
    const res = await api.get("/pembelian/mkb/form/linkable-po", {
      params: { kode: props.kodeBahan, mkb: props.mkbNomor },
    });
    items.value = res.data.data || [];
  } catch (e) {
    console.error("Gagal memuat PO linkable", e);
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

const filteredItems = ref<any[]>([]);
watch([items, search], () => {
  if (!search.value) {
    filteredItems.value = items.value;
    return;
  }
  const q = search.value.toLowerCase();
  filteredItems.value = items.value.filter(
    (i) =>
      String(i.NOPO ?? "")
        .toLowerCase()
        .includes(q) ||
      String(i.TglPO ?? "")
        .toLowerCase()
        .includes(q),
  );
});

const selectItem = (item: any) => {
  emit("selected", item);
  emit("update:modelValue", false);
};

const fmtNum = (v: any) =>
  Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="600px"
  >
    <div class="lookup-card">
      <!-- Header -->
      <div class="lookup-header">
        <IconLink :size="15" :stroke-width="1.7" color="white" class="mr-2" />
        <span
          >Pilih PO untuk Bahan: <b>{{ kodeBahan }}</b></span
        >
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <!-- Search -->
      <div class="lookup-search">
        <IconSearch :size="15" :stroke-width="1.7" color="#9e9e9e" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nomor PO..."
          class="search-input"
          autofocus
        />
      </div>

      <!-- Table -->
      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="filteredItems.length === 0" class="lookup-state">
          <span class="text-grey">Tidak ada data PO tersedia</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th>NO. PO</th>
              <th style="width: 100px">TANGGAL</th>
              <th style="width: 90px; text-align: right">QTY PO</th>
              <th style="width: 90px; text-align: right">SISA LINK</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.NOPO"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.NOPO }}</td>
              <td>{{ item.TglPO }}</td>
              <td style="text-align: right">{{ fmtNum(item.JmlPO) }}</td>
              <td style="text-align: right; color: #2e7d32; font-weight: 600">
                {{ fmtNum(item.Sisa) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer info -->
      <div class="lookup-footer">{{ filteredItems.length }} PO tersedia</div>
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
}
.lookup-header {
  display: flex;
  align-items: center;
  background: #455a64;
  color: white;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}
.lookup-close {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  cursor: pointer;
  line-height: 1;
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
  background: #fafafa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
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
  min-height: 120px;
  max-height: 380px;
}
.lookup-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #9e9e9e;
  font-size: 12px;
}
.lookup-table {
  width: 100%;
  border-collapse: collapse;
}
.lookup-table thead th {
  background: #455a64;
  color: white;
  padding: 6px 10px;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  position: sticky;
  top: 0;
  z-index: 1;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
}
.lookup-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  color: #212121;
}
.lookup-row:hover td {
  background: #eceff1;
  cursor: pointer;
}
.td-kode {
  color: #1565c0;
  font-weight: 600;
}
.lookup-footer {
  padding: 5px 12px;
  background: #f5f5f5;
  border-top: 1px solid #e0e0e0;
  font-size: 11px;
  color: #757575;
  flex-shrink: 0;
}
</style>
