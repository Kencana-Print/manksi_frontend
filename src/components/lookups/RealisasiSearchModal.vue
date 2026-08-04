<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { returBarangFormService } from "@/services/garmen/returBarangFormService";
import {
  IconClipboardList,
  IconSearch,
  IconDatabaseOff,
  IconArrowLeft,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

interface HeaderItem {
  Nomor: string;
  Tanggal: string;
  SPK: string;
}
interface DetailItem {
  NoRealisasi: string;
  Tanggal: string;
  SPK: string;
  Kode: string;
  Nama: string;
  Satuan: string;
  Minta: number;
  Sudah: number;
  SpkNama: string;
}

const props = defineProps<{
  modelValue: boolean;
  jenis: string;
  currentNomor?: string;
  presetHeaderNomor?: string; // kalau diisi, modal langsung ke step 'detail'
}>();
const emit = defineEmits(["update:modelValue", "selected"]);

const step = ref<"header" | "detail">("header");
const search = ref("");
const headerItems = ref<HeaderItem[]>([]);
const detailItems = ref<DetailItem[]>([]);
const selectedHeader = ref<HeaderItem | null>(null);
const isLoading = ref(false);

// Pagination (cuma step header)
const currentPage = ref(1);
const perPage = ref(50);
const totalItems = ref(0);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalItems.value / perPage.value)),
);
const pageStart = computed(() =>
  totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1,
);
const pageEnd = computed(() =>
  Math.min(currentPage.value * perPage.value, totalItems.value),
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

let debounce: ReturnType<typeof setTimeout> | null = null;

const fetchHeader = async () => {
  isLoading.value = true;
  try {
    const res = await returBarangFormService.searchRealisasiHeader(
      props.jenis,
      search.value,
      currentPage.value,
      perPage.value,
    );
    headerItems.value = res.data.data.items;
    totalItems.value = res.data.data.total;
  } finally {
    isLoading.value = false;
  }
};

const fetchDetail = async (nomorRealisasi: string) => {
  isLoading.value = true;
  try {
    const res = await returBarangFormService.searchRealisasiDetail(
      props.jenis,
      nomorRealisasi,
      props.currentNomor,
    );
    detailItems.value = res.data.data;
  } finally {
    isLoading.value = false;
  }
};

const onSearch = (val: string) => {
  search.value = val;
  currentPage.value = 1;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(fetchHeader, 500);
};

const goToPage = (p: number) => {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value));
  fetchHeader();
};

watch(
  () => props.modelValue,
  async (isOpen) => {
    if (isOpen) {
      search.value = "";
      if (props.presetHeaderNomor) {
        step.value = "detail";
        selectedHeader.value = {
          Nomor: props.presetHeaderNomor,
          Tanggal: "",
          SPK: "",
        };
        await fetchDetail(props.presetHeaderNomor);
      } else {
        step.value = "header";
        currentPage.value = 1;
        selectedHeader.value = null;
        fetchHeader();
      }
    }
  },
);

const pickHeader = async (item: HeaderItem) => {
  selectedHeader.value = item;
  step.value = "detail";
  await fetchDetail(item.Nomor);
};

const backToHeader = () => {
  step.value = "header";
  detailItems.value = [];
};

const selectItem = (item: DetailItem) => {
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
        <button
          v-if="step === 'detail'"
          class="lookup-back"
          @click="backToHeader"
        >
          <IconArrowLeft :size="15" />
        </button>
        <IconClipboardList :size="15" :stroke-width="1.7" color="white" />
        <span>
          {{
            step === "header"
              ? "Cari No. Realisasi Permintaan"
              : `Pilih Barang: ${selectedHeader?.Nomor}`
          }}
        </span>
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
          :placeholder="
            step === 'header'
              ? 'Cari nomor / SPK...'
              : 'Cari kode / nama barang...'
          "
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

        <!-- STEP 1: HEADER -->
        <template v-else-if="step === 'header'">
          <div v-if="headerItems.length === 0" class="lookup-state">
            <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
            <span>Tidak ada data.</span>
          </div>
          <table v-else class="lookup-table">
            <thead>
              <tr>
                <th style="width: 160px">NOMOR</th>
                <th style="width: 100px">TANGGAL</th>
                <th>SPK</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in headerItems"
                :key="item.Nomor"
                class="lookup-row"
                @click="pickHeader(item)"
              >
                <td class="td-kode">{{ item.Nomor }}</td>
                <td>{{ formatTanggal(item.Tanggal) }}</td>
                <td>{{ item.SPK }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- STEP 2: DETAIL -->
        <template v-else>
          <div v-if="detailItems.length === 0" class="lookup-state">
            <IconDatabaseOff :size="32" :stroke-width="1.3" color="#bdbdbd" />
            <span>Tidak ada rincian barang.</span>
          </div>
          <table v-else class="lookup-table">
            <thead>
              <tr>
                <th style="width: 110px">KODE</th>
                <th>NAMA</th>
                <th style="width: 60px">SATUAN</th>
                <th style="width: 80px; text-align: right">MINTA</th>
                <th style="width: 80px; text-align: right">SUDAH</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in detailItems"
                :key="item.Kode"
                class="lookup-row"
                @click="selectItem(item)"
              >
                <td class="td-kode">{{ item.Kode }}</td>
                <td>{{ item.Nama }}</td>
                <td>{{ item.Satuan }}</td>
                <td style="text-align: right">{{ item.Minta }}</td>
                <td style="text-align: right">{{ item.Sudah }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <div v-if="step === 'header'" class="lookup-footer">
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
.lookup-back {
  background: transparent;
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  padding: 0;
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
