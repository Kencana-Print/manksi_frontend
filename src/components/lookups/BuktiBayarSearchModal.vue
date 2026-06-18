<script setup lang="ts">
import { ref, watch, computed } from "vue";
import api from "@/services/api";
import { IconReceipt, IconSearch, IconDatabaseOff } from "@tabler/icons-vue";

const props = defineProps<{
  modelValue: boolean;
  cabang: string;
  kode: string; // kode bayar: BG, BT, CS, PT, RT
}>();

const emit = defineEmits(["update:modelValue", "selected"]);

const search = ref("");
const items = ref<any[]>([]);
const isLoading = ref(false);

const isRetur = computed(() => props.kode === "RT");

const fetchData = async () => {
  if (!props.cabang || !props.kode) return;
  isLoading.value = true;
  try {
    const res = await api.get("/lookups/bukti-bayar", {
      params: { cabang: props.cabang, kode: props.kode, search: search.value },
    });
    items.value = res.data.data || [];
  } catch {
    items.value = [];
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
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
      (i.Nomor || "").toLowerCase().includes(q) ||
      (i.Customer || "").toLowerCase().includes(q) ||
      (i.Keterangan || "").toLowerCase().includes(q),
  );
});

const fmtNum = (n: any) =>
  new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));

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
      <!-- Header -->
      <div class="lookup-header">
        <IconReceipt :size="15" :stroke-width="1.7" color="white" />
        <span>
          Pilih No. Bukti Bayar
          <span v-if="kode" class="kode-badge">{{ kode }}</span>
        </span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <!-- Search -->
      <div class="lookup-search">
        <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nomor / customer / keterangan..."
          class="search-input"
          autofocus
          @keydown.enter="fetchData"
        />
        <button class="search-btn" @click="fetchData" :disabled="isLoading">
          Cari
        </button>
        <button
          v-if="search"
          class="search-clear"
          @click="
            search = '';
            fetchData();
          "
        >
          ✕
        </button>
      </div>

      <!-- Table -->
      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="filteredItems.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>{{
            search ? `Tidak ada hasil untuk "${search}"` : "Tidak ada data"
          }}</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 180px">NOMOR</th>
              <th style="width: 100px">TANGGAL</th>
              <th v-if="!isRetur" style="width: 50px">KODE</th>
              <th>CUSTOMER</th>
              <th style="width: 130px" class="tr">DEBET</th>
              <th v-if="isRetur" style="width: 160px">KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in filteredItems"
              :key="item.Nomor"
              class="lookup-row"
              @click="selectItem(item)"
            >
              <td class="td-kode">{{ item.Nomor }}</td>
              <td>{{ item.Tanggal }}</td>
              <td v-if="!isRetur" class="tc">{{ item.Kode }}</td>
              <td>{{ item.Customer }}</td>
              <td
                class="tr"
                style="font-family: monospace; color: #1565c0; font-weight: 600"
              >
                {{ fmtNum(item.Debet) }}
              </td>
              <td v-if="isRetur">{{ item.Keterangan }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="lookup-footer">
        <span class="footer-count"
          >{{ filteredItems.length }} dari {{ items.length }} data</span
        >
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
  letter-spacing: 0.03em;
  flex-shrink: 0;
  gap: 6px;
}
.kode-badge {
  background: rgba(255, 255, 255, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 700;
  margin-left: 4px;
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
.search-btn {
  background: #1565c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 3px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  height: 26px;
}
.search-btn:hover {
  background: #0d47a1;
}
.search-btn:disabled {
  background: #90caf9;
  cursor: default;
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
  max-height: 440px;
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
  letter-spacing: 0.04em;
  color: white;
  border: 1px solid #0d47a1;
  border-bottom: none;
  text-align: left;
  white-space: nowrap;
}
.lookup-table th.tr {
  text-align: right;
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
.tc {
  text-align: center;
}
.tr {
  text-align: right;
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
</style>
