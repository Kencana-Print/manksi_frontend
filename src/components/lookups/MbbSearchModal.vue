<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  IconClipboardSearch,
  IconSearch,
  IconDatabaseOff,
} from "@tabler/icons-vue";
import {
  poBahanFormService,
  type MbbOutstandingRow,
} from "@/services/pembelian/poBahanFormService";
import { pesanError } from "@/services/piutang/rekapPembayaranService";

const props = defineProps<{
  modelValue: boolean;
  jenis: number;
  exclude?: string;
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

interface MbbDoc {
  nomor: string;
  tanggal: string;
  cab: string;
  ket: string;
  rows: MbbOutstandingRow[];
  ringkas: string;
}

const search = ref("");
const items = ref<MbbOutstandingRow[]>([]);
const isLoading = ref(false);
const errorMsg = ref("");

// Kelompokkan baris outstanding per dokumen permintaan
const docs = computed<MbbDoc[]>(() => {
  const peta = new Map<string, MbbDoc>();
  for (const r of items.value) {
    let d = peta.get(r.nomor);
    if (!d) {
      d = {
        nomor: r.nomor,
        tanggal: r.tanggal,
        cab: r.cab,
        ket: r.ket ?? "",
        rows: [],
        ringkas: "",
      };
      peta.set(r.nomor, d);
    }
    d.rows.push(r);
  }
  return [...peta.values()].map((d) => {
    const nama = d.rows.slice(0, 3).map((r) => r.nama);
    return {
      ...d,
      ringkas: nama.join(", ") + (d.rows.length > 3 ? ", ..." : ""),
    };
  });
});

const hasilCari = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return docs.value;
  return docs.value.filter(
    (d) =>
      [d.nomor, d.cab, d.ket].some((s) => s.toLowerCase().includes(q)) ||
      d.rows.some(
        (r) =>
          r.kode.toLowerCase().includes(q) || r.nama.toLowerCase().includes(q),
      ),
  );
});

// Pagination sisi klien
const currentPage = ref(1);
const perPage = ref(50);
const totalItems = computed(() => hasilCari.value.length);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalItems.value / perPage.value)),
);
const pageStart = computed(() =>
  totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1,
);
const pageEnd = computed(() =>
  Math.min(currentPage.value * perPage.value, totalItems.value),
);
const tampil = computed(() =>
  hasilCari.value.slice(pageStart.value - 1, pageEnd.value),
);

const visiblePages = computed(() => {
  const total = totalPages.value,
    cur = currentPage.value;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  let start = Math.max(1, cur - 2);
  let end = Math.min(total, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

const goToPage = (p: number) => {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value));
};

const onSearch = (val: string) => {
  search.value = val;
  currentPage.value = 1;
};

const fmtTgl = (val: string) => {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${d.getFullYear()}`;
};

const fetchData = async () => {
  isLoading.value = true;
  errorMsg.value = "";
  try {
    const res = await poBahanFormService.getMbbOutstanding(
      props.jenis,
      props.exclude ?? "",
    );
    items.value = res.data.data ?? [];
  } catch (e) {
    items.value = [];
    errorMsg.value = pesanError(e, "Gagal memuat permintaan pembelian bahan.");
  } finally {
    isLoading.value = false;
  }
};

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

const selectItem = (d: MbbDoc) => {
  emit("selected", d.rows);
  emit("update:modelValue", false);
};
</script>

<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    max-width="900px"
  >
    <div class="lookup-card">
      <!-- Header -->
      <div class="lookup-header">
        <IconClipboardSearch :size="15" :stroke-width="1.7" color="white" />
        <span>Pilih Permintaan Pembelian Bahan</span>
        <span class="lookup-header-sub">Hanya yang masih punya sisa</span>
        <v-spacer />
        <button class="lookup-close" @click="emit('update:modelValue', false)">
          ✕
        </button>
      </div>

      <!-- Search -->
      <div class="lookup-search">
        <IconSearch :size="16" :stroke-width="1.7" color="#9e9e9e" />
        <input
          :value="search"
          @input="onSearch(($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Cari nomor, keterangan, kode atau nama bahan..."
          class="search-input"
          autofocus
        />
        <button v-if="search" class="search-clear" @click="onSearch('')">
          ✕
        </button>
      </div>

      <!-- Table -->
      <div class="lookup-table-wrap">
        <div v-if="isLoading" class="lookup-state">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span>Memuat data...</span>
        </div>
        <div v-else-if="errorMsg" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#e57373" />
          <span>{{ errorMsg }}</span>
        </div>
        <div v-else-if="tampil.length === 0" class="lookup-state">
          <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
          <span>{{
            search
              ? `Tidak ada hasil untuk "${search}"`
              : "Tidak ada permintaan yang masih punya sisa"
          }}</span>
        </div>
        <table v-else class="lookup-table">
          <thead>
            <tr>
              <th style="width: 130px">NOMOR</th>
              <th style="width: 88px">TANGGAL</th>
              <th style="width: 50px">CAB</th>
              <th style="min-width: 160px">KETERANGAN</th>
              <th style="width: 60px; text-align: right">ITEM</th>
              <th style="min-width: 220px">BAHAN</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="d in tampil"
              :key="d.nomor"
              class="lookup-row"
              @click="selectItem(d)"
            >
              <td class="td-kode">{{ d.nomor }}</td>
              <td>{{ fmtTgl(d.tanggal) }}</td>
              <td>{{ d.cab }}</td>
              <td>{{ d.ket || "-" }}</td>
              <td style="text-align: right">{{ d.rows.length }}</td>
              <td class="td-ringkas">{{ d.ringkas }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="lookup-footer">
        <span class="footer-count"
          >{{ pageStart }}–{{ pageEnd }} dari {{ totalItems }} data</span
        >

        <div class="page-controls">
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="goToPage(1)"
          >
            «
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === 1"
            @click="goToPage(currentPage - 1)"
          >
            ‹
          </button>
          <button
            v-for="p in visiblePages"
            :key="p"
            class="page-btn"
            :class="{ active: p === currentPage }"
            @click="goToPage(p)"
          >
            {{ p }}
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="goToPage(currentPage + 1)"
          >
            ›
          </button>
          <button
            class="page-btn"
            :disabled="currentPage === totalPages"
            @click="goToPage(totalPages)"
          >
            »
          </button>
        </div>

        <select v-model="perPage" class="per-page-select" @change="goToPage(1)">
          <option v-for="n in [25, 50, 100]" :key="n" :value="n">
            {{ n }} / hal
          </option>
        </select>
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
.lookup-header-sub {
  font-size: 10px;
  font-weight: 400;
  opacity: 0.75;
  letter-spacing: 0;
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
.td-kode {
  font-family: monospace;
  font-weight: 600;
  font-size: 12px;
  color: #1565c0;
}
.td-ringkas {
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lookup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
.page-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}
.page-btn {
  min-width: 28px;
  height: 26px;
  padding: 0 5px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: white;
  font-size: 12px;
  color: #424242;
  cursor: pointer;
  transition: all 0.12s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-btn:hover:not(:disabled) {
  background: #e3f2fd;
  border-color: #90caf9;
  color: #1565c0;
}
.page-btn.active {
  background: #1976d2;
  border-color: #1976d2;
  color: white;
  font-weight: 700;
}
.page-btn:disabled {
  opacity: 0.3;
  cursor: default;
}
.per-page-select {
  height: 26px;
  padding: 0 4px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 11px;
  color: #424242;
  background: white;
  cursor: pointer;
  outline: none;
}
</style>
