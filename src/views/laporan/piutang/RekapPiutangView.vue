<script setup lang="ts">
import { ref, computed } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { rekapPiutangService } from "@/services/laporan/piutang/rekapPiutangService";
import { IconFileAnalytics, IconSearch } from "@tabler/icons-vue";

// Import Modal Perusahaan
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";

const menuId = "968"; // Akses ikut parent Laporan Piutang

const getLocalDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filterState = ref({
  endDate: getLocalDate(),
  perusahaan: "", // Menyimpan Kode Cabang/Perusahaan
});

// State untuk Modal Perusahaan
const showPerusahaanModal = ref(false);
const selectedPerusahaanNama = ref("");

// Daftar singkatan bulan statis
const allMonths = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

// Komputasi kolom dinamis: tampilkan hingga bulan dari endDate
const maxMonth = computed(() => {
  const d = new Date(filterState.value.endDate);
  return d.getMonth() + 1; // 1 s.d 12
});

const visibleMonths = computed(() => allMonths.slice(0, maxMonth.value));

const dynamicHeaders = computed(() => {
  const base = [
    { title: "Kode", key: "Kode", width: "100px" },
    { title: "Customer", key: "Customer", minWidth: "250px" },
    { title: "Tahun Lalu", key: "TahunLalu", width: "120px", align: "right" },
  ];

  for (const m of visibleMonths.value) {
    base.push({ title: m, key: m, width: "120px", align: "right" });
  }

  base.push({
    title: "Grand Total",
    key: "GrandTotal",
    width: "140px",
    align: "right",
  });
  return base;
});

const { items, isLoading, canExport, fetchData, exportToExcel } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await rekapPiutangService.getBrowse(filterState.value);
    return res.data.data || [];
  },
  immediate: true,
});

// --- HANDLER MODAL PERUSAHAAN ---
const openPerusahaanModal = () => {
  showPerusahaanModal.value = true;
};

const onPerusahaanSelected = (item: any) => {
  filterState.value.perusahaan = item.perush_kode;
  selectedPerusahaanNama.value = item.perush_nama;
  fetchData();
};

const clearPerusahaan = () => {
  filterState.value.perusahaan = "";
  selectedPerusahaanNama.value = "";
  fetchData();
};

const getRowProps = () => ({});

// PEMBULATAN KE ATAS: menggunakan Math.ceil() sebelum di-format
const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));

const getTotal = (key: string, filteredItems: any[]) => {
  return filteredItems.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
};

// Array kunci angka untuk loop format sel
const numericKeys = computed(() => [
  "TahunLalu",
  ...visibleMonths.value,
  "GrandTotal",
]);
</script>

<template>
  <BaseBrowse
    title="Laporan Rekap Piutang"
    :menu-id="menuId"
    :icon="IconFileAnalytics"
    :headers="dynamicHeaders"
    :items="items ?? []"
    item-value="Kode"
    :is-loading="isLoading"
    v-model:filterState="filterState"
    :can-export="canExport"
    :row-props-fn="getRowProps"
    @refresh="fetchData"
    @export="exportToExcel('Laporan_Rekap_Piutang')"
  >
    <template #filter-left>
      <div class="d-flex align-center gap-2">
        <span class="f-label">S.D Tanggal</span>
        <input
          type="date"
          v-model="filterState.endDate"
          class="f-date"
          @change="fetchData"
        />

        <div class="f-divider" />

        <span class="f-label">Perusahaan</span>
        <v-text-field
          :model-value="
            filterState.perusahaan
              ? `[${filterState.perusahaan}] ${selectedPerusahaanNama}`
              : ''
          "
          placeholder="F1 atau klik icon..."
          variant="outlined"
          density="compact"
          hide-details
          readonly
          clearable
          class="f-search-perusahaan"
          @keydown.f1.prevent="openPerusahaanModal"
          @click:clear="clearPerusahaan"
        >
          <template #append-inner>
            <IconSearch
              :size="16"
              color="#1565c0"
              style="cursor: pointer; align-self: center"
              @click="openPerusahaanModal"
            />
          </template>
        </v-text-field>
      </div>
    </template>

    <template v-for="k in numericKeys" :key="k" #[`item.${k}`]="{ item }">
      <span :class="k === 'GrandTotal' ? 'font-weight-bold text-primary' : ''">
        {{ fmtNum(item[k]) }}
      </span>
    </template>

    <template #summary-row="{ filteredItems }">
      <div class="d-flex align-center gap-2 w-100 pr-2 summary-container">
        <span class="summary-lbl ml-auto pr-3">TOTAL:</span>

        <div class="d-flex flex-column align-end mx-1">
          <span class="summary-sublbl">Tahun Lalu</span>
          <span class="summary-val">{{
            fmtNum(getTotal("TahunLalu", filteredItems))
          }}</span>
        </div>

        <div
          v-for="m in visibleMonths"
          :key="m"
          class="d-flex flex-column align-end mx-1 pl-2"
          style="border-left: 1px solid rgba(255, 255, 255, 0.15)"
        >
          <span class="summary-sublbl">{{ m.toUpperCase() }}</span>
          <span class="summary-val">{{
            fmtNum(getTotal(m, filteredItems))
          }}</span>
        </div>

        <div
          class="d-flex flex-column align-end pl-3 ml-2"
          style="border-left: 2px solid rgba(255, 255, 255, 0.4)"
        >
          <span class="summary-sublbl text-yellow-accent-2">GRAND TOTAL</span>
          <span
            class="summary-val text-yellow-accent-2"
            style="font-size: 14px"
            >{{ fmtNum(getTotal("GrandTotal", filteredItems)) }}</span
          >
        </div>
      </div>
    </template>
  </BaseBrowse>

  <PerusahaanSearchModal
    v-model="showPerusahaanModal"
    @selected="onPerusahaanSelected"
  />
</template>

<style scoped>
/* ── Filter ── */
.gap-2 {
  gap: 8px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 10px;
}

/* Styling khusus untuk input pencarian Perusahaan agar tidak terlalu sempit */
.f-search-perusahaan {
  width: 300px;
  background: white;
  border-radius: 4px;
}
.f-search-perusahaan :deep(.v-field__input) {
  min-height: 28px !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.f-search-perusahaan :deep(.v-field__clearable) {
  align-items: center;
  align-self: center;
  padding-top: 0;
}

/* ── Summary Row Styles ── */
.summary-container {
  overflow-x: auto;
  padding-bottom: 2px;
}
.summary-lbl {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}
.summary-sublbl {
  font-size: 9px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: -2px;
}
.summary-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  letter-spacing: 0.02em;
}
</style>
