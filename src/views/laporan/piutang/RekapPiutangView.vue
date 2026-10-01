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

// State untuk Dialog Detail Piutang per Customer
const showDetailDialog = ref(false);
const detailLoading = ref(false);
const detailItems = ref<any[]>([]);
const detailCustomerNama = ref("");

const detailHeaders = [
  { title: "Nota", key: "Nota" },
  { title: "Tanggal", key: "Tanggal" },
  { title: "Debet", key: "Debet", align: "end" },
  { title: "Bayar", key: "Bayar", align: "end" },
  { title: "Sisa", key: "Sisa", align: "end" },
] as const;

const fmtDate = (val: string) => {
  if (!val) return "";
  const d = new Date(val);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const openDetailDialog = async (item: any) => {
  detailCustomerNama.value = `[${item.Kode}] ${item.Customer}`;
  showDetailDialog.value = true;
  detailLoading.value = true;
  detailItems.value = [];
  try {
    const res = await rekapPiutangService.getDetail({
      customer: item.Kode,
      endDate: filterState.value.endDate,
      perusahaan: filterState.value.perusahaan,
    });
    detailItems.value = res.data.data || [];
  } finally {
    detailLoading.value = false;
  }
};

const detailTotalSisa = computed(() =>
  detailItems.value.reduce((sum, r) => sum + (Number(r.Sisa) || 0), 0),
);

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
  new Intl.NumberFormat("id-ID").format(Math.round(val || 0));

const getTotal = (key: string, filteredItems: any[]) => {
  return filteredItems.reduce((sum, item) => sum + (Number(item[key]) || 0), 0);
};

const exportData = computed(() => {
  const totalRow: Record<string, any> = { Kode: "", Customer: "GRAND TOTAL" };
  for (const key of numericKeys.value) {
    totalRow[key] = getTotal(key, items.value ?? []);
  }
  return [...(items.value ?? []), totalRow];
});

// Array kunci angka untuk loop format sel
const numericKeys = computed(() => [
  "TahunLalu",
  ...visibleMonths.value,
  "GrandTotal",
]);

const summaryFormatters = computed(() => {
  const result: Record<string, (rows: any[]) => string> = {};
  for (const key of numericKeys.value) {
    result[key] = (rows: any[]) => {
      const total = rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);
      return fmtNum(total);
    };
  }
  return result;
});
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
    :summary-columns="numericKeys"
    :summary-formatters="summaryFormatters"
    @refresh="fetchData"
    @export="
      exportToExcel('Laporan_Rekap_Piutang', { getData: () => exportData })
    "
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

    <template #item.Customer="{ item }">
      <span class="customer-link" @click="openDetailDialog(item)">
        {{ item.Customer }}
      </span>
    </template>

    <template v-for="k in numericKeys" :key="k" #[`item.${k}`]="{ item }">
      <span :class="k === 'GrandTotal' ? 'font-weight-bold text-primary' : ''">
        {{ fmtNum(item[k]) }}
      </span>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showDetailDialog" max-width="900">
    <v-card rounded="lg" class="detail-card">
      <v-card-title
        class="detail-header d-flex align-center justify-space-between"
      >
        <div class="d-flex align-center gap-2">
          <v-icon icon="mdi-receipt-text-outline" size="22" color="white" />
          <div>
            <div class="detail-title">Detail Piutang Outstanding</div>
            <div class="detail-subtitle">{{ detailCustomerNama }}</div>
          </div>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          color="white"
          density="comfortable"
          @click="showDetailDialog = false"
        />
      </v-card-title>

      <v-card-text class="pa-0">
        <v-data-table-virtual
          :headers="detailHeaders"
          :items="detailItems"
          :loading="detailLoading"
          height="420"
          fixed-header
          density="comfortable"
          no-data-text="Tidak ada piutang outstanding"
          class="detail-table"
        >
          <template #item.Tanggal="{ item }">{{
            fmtDate(item.Tanggal)
          }}</template>
          <template #item.Debet="{ item }">{{ fmtNum(item.Debet) }}</template>
          <template #item.Bayar="{ item }">{{ fmtNum(item.Bayar) }}</template>
          <template #item.Sisa="{ item }">
            <span
              class="sisa-val"
              :class="item.Sisa < 0 ? 'text-error' : 'text-primary'"
            >
              {{ fmtNum(item.Sisa) }}
            </span>
          </template>
        </v-data-table-virtual>
      </v-card-text>

      <v-divider />

      <v-card-actions
        class="detail-footer d-flex justify-space-between align-center px-4 py-3"
      >
        <span class="text-caption text-medium-emphasis">
          {{ detailItems.length }} invoice outstanding
        </span>
        <div class="d-flex align-center gap-2">
          <span class="text-body-2 font-weight-medium">Total Sisa Piutang</span>
          <span class="total-sisa">{{ fmtNum(detailTotalSisa) }}</span>
        </div>
      </v-card-actions>
    </v-card>
  </v-dialog>

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

.customer-link {
  color: #1565c0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.15s;
}
.customer-link:hover {
  text-decoration-color: #1565c0;
}

.detail-card {
  overflow: hidden;
}
.detail-header {
  background: linear-gradient(135deg, #1565c0, #1976d2);
  padding: 16px 20px;
}
.detail-title {
  font-size: 15px;
  font-weight: 700;
  color: white;
  line-height: 1.2;
}
.detail-subtitle {
  font-size: 12.5px;
  color: #e3f2fd;
}
.detail-table :deep(thead th) {
  background: #f5f7fa !important;
  font-weight: 700 !important;
  font-size: 11.5px !important;
  text-transform: uppercase;
  color: #555 !important;
}
.detail-table :deep(tbody tr:hover) {
  background: #f0f7ff !important;
}
.sisa-val {
  font-weight: 700;
}
.detail-footer {
  background: #fafafa;
}
.total-sisa {
  font-size: 16px;
  font-weight: 800;
  color: #1565c0;
}
</style>
