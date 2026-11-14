<template>
  <div class="sjhm-wrapper">
    <!-- Tab Selector -->
    <v-card flat class="mb-2">
      <v-tabs
        v-model="activeTab"
        color="primary"
        density="compact"
        class="border-b"
      >
        <v-tab value="outstanding" class="font-weight-bold">
          <v-icon start size="18">mdi-clock-outline</v-icon>
          Outstanding ({{ outstandingItems.length }})
        </v-tab>
        <v-tab value="history" class="font-weight-bold">
          <v-icon start size="18">mdi-history</v-icon>
          Riwayat SJ Hasil Maklon ({{ historyItems.length }})
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- TAB 1: OUTSTANDING -->
    <!-- ══════════════════════════════════════════════════════ -->
    <BaseBrowse
      v-if="activeTab === 'outstanding'"
      title="SJ Hasil Maklon — Outstanding"
      menu-id="mmt-sj-hasil-maklon-out"
      icon="mdi-truck-delivery"
      :headers="outstandingHeaders"
      :items="outstandingItems"
      :is-loading="isLoading"
      :loading="isLoading"
      v-model:selected="selectedOutstanding"
      item-value="DtfMaklonHasilId"
      :show-actions="false"
      :can-insert="false"
      :row-props-fn="getOutstandingRowProps"
      :row-props="getOutstandingRowProps"
      v-model:startDate="filters.startDate"
      v-model:endDate="filters.endDate"
      :summary-fields="['QtyMasuk', 'QtyHasil', 'BsAfval']"
      @refresh="fetchOutstanding"
      @row-click="handleOutstandingRowClick"
      @dblclick:row="handleOutstandingDblClick"
    >
      <!-- Tip / Prepend info -->
      <template #prepend-content>
        <div class="d-flex align-center justify-space-between px-4 py-2 bg-grey-lighten-4 mb-2 rounded text-caption">
          <div class="d-flex align-center">
            <v-icon size="14" class="mr-2" color="blue-grey-darken-2">mdi-information-outline</v-icon>
            <span>
              Klik baris / centang kotak untuk memilih hasil maklon yang akan dibuatkan Surat Jalan.
              <strong>(Semua baris terpilih harus berasal dari No. Maklon yang sama)</strong>
            </span>
          </div>
          <div v-if="selectedOutstanding.length > 0">
            <v-chip
              size="x-small"
              :color="canBuatSj ? 'primary' : 'error'"
              variant="flat"
              class="font-weight-bold"
            >
              {{ selectedOutstanding.length }} baris dipilih
              <template v-if="distinctMklNomor.size === 1">
                ({{ Array.from(distinctMklNomor)[0] }})
              </template>
              <template v-else-if="distinctMklNomor.size > 1">
                (Error: {{ distinctMklNomor.size }} No. Maklon berbeda!)
              </template>
            </v-chip>
          </div>
        </div>
      </template>

      <!-- Action buttons -->
      <template #extra-actions>
        <v-btn
          size="x-small"
          :color="canBuatSj ? 'primary' : 'grey-lighten-1'"
          :disabled="!canBuatSj"
          @click="goBuatSj"
          class="mr-2 font-weight-bold"
        >
          <v-icon start size="15">mdi-truck-delivery</v-icon>
          Buat SJ Hasil Maklon
          <span v-if="selectedOutstanding.length > 0" class="ml-1">
            ({{ selectedOutstanding.length }})
          </span>
        </v-btn>
        <v-btn
          size="x-small"
          color="success"
          @click="goInputBaru"
        >
          <v-icon start size="15">mdi-plus-box</v-icon>
          Input Buat SJ Baru
        </v-btn>
      </template>

      <!-- Filter fields -->
      <template #filter-fields>
        <v-checkbox
          v-model="filters.semuaCabang"
          label="Semua Cabang"
          density="compact"
          hide-details
          color="primary"
          class="mr-2"
          @update:model-value="fetchOutstanding"
        />
        <v-text-field
          v-model="filters.search"
          label="Cari No. Maklon / Barang..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="compact-search-field"
          style="max-width: 240px"
          @keyup.enter="fetchOutstanding"
          @click:clear="onClearSearch"
        />
      </template>

      <!-- Custom Columns -->
      <template #item.selectCol="{ item }">
        <div class="d-flex justify-center" @click.stop="toggleSelectRow(item)">
          <v-icon
            :color="isRowSelected(item) ? 'primary' : 'grey-lighten-1'"
            size="22"
            class="cursor-pointer"
          >
            {{ isRowSelected(item) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
          </v-icon>
        </div>
      </template>

      <template #item.MklNomor="{ item }">
        <span class="font-weight-bold text-primary">{{ item.MklNomor }}</span>
      </template>

      <template #item.Tanggal="{ item }">
        {{ formatDateCell(item.Tanggal) }}
      </template>

      <template #item.LhkNomor="{ item }">
        <span class="font-weight-medium">{{ item.LhkNomor || "-" }}</span>
        <v-chip
          v-if="item.Sumber"
          size="x-small"
          :color="item.Sumber === 'P05' ? 'purple-darken-1' : 'blue-darken-1'"
          variant="tonal"
          class="ml-1"
        >
          {{ item.Sumber }}
        </v-chip>
      </template>

      <template #item.CabAsal="{ item }">
        <span>{{ item.CabAsal }}</span>
        <span v-if="item.NamaCabAsal" class="text-caption text-grey-darken-1"> ({{ item.NamaCabAsal }})</span>
      </template>

      <template #item.CabTujuan="{ item }">
        <span>{{ item.CabTujuan }}</span>
        <span v-if="item.NamaCabTujuan" class="text-caption text-grey-darken-1"> ({{ item.NamaCabTujuan }})</span>
      </template>

      <template #item.KodePolos="{ item }">
        <div class="font-weight-medium">{{ item.KodePolos }}</div>
        <div v-if="item.NamaPolos" class="text-caption text-grey-darken-1">{{ item.NamaPolos }}</div>
      </template>

      <template #item.KodeHasil="{ item }">
        <div class="font-weight-medium text-purple-darken-3">{{ item.KodeHasil }}</div>
        <div v-if="item.NamaHasil" class="text-caption text-grey-darken-1">{{ item.NamaHasil }}</div>
      </template>

      <template #item.QtyMasuk="{ item }">
        {{ formatNumber(item.QtyMasuk) }}
      </template>

      <template #item.QtyHasil="{ item }">
        <span class="font-weight-bold text-success">{{ formatNumber(item.QtyHasil) }}</span>
      </template>

      <template #item.BsAfval="{ item }">
        <span class="text-error font-weight-medium">{{ formatNumber(item.BsAfval) }}</span>
      </template>
    </BaseBrowse>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- TAB 2: RIWAYAT / HISTORY -->
    <!-- ══════════════════════════════════════════════════════ -->
    <BaseBrowse
      v-else
      title="SJ Hasil Maklon — Riwayat"
      menu-id="mmt-sj-hasil-maklon-hist"
      icon="mdi-history"
      :headers="historyHeaders"
      :items="historyItems"
      :is-loading="isLoading"
      :loading="isLoading"
      v-model:selected="selectedHistory"
      v-model:expanded="expandedHistory"
      :show-expand="true"
      :has-print="true"
      item-value="Nomor"
      :show-actions="false"
      :can-insert="false"
      :row-props-fn="getHistoryRowProps"
      :row-props="getHistoryRowProps"
      v-model:startDate="filters.startDate"
      v-model:endDate="filters.endDate"
      :summary-fields="['TotalTerima', 'TotalBs']"
      @refresh="fetchHistory"
      @print="handlePrintHistory"
      @row-click="handleHistoryRowClick"
    >
      <!-- Action buttons -->
      <template #extra-actions>
        <v-btn
          size="x-small"
          color="info"
          :disabled="!selectedHistoryItem"
          @click="handlePrintHistory"
        >
          <v-icon start size="15">mdi-printer</v-icon>
          Cetak SJ
        </v-btn>
      </template>

      <!-- Filter fields -->
      <template #filter-fields>
        <v-checkbox
          v-model="filters.semuaCabang"
          label="Semua Cabang"
          density="compact"
          hide-details
          color="primary"
          class="mr-2"
          @update:model-value="fetchHistory"
        />
        <v-text-field
          v-model="filters.search"
          label="Cari No. SJ / No. Maklon..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="compact-search-field"
          style="max-width: 240px"
          @keyup.enter="fetchHistory"
          @click:clear="onClearSearch"
        />
      </template>

      <!-- Custom Columns -->
      <template #item.Nomor="{ item }">
        <span class="font-weight-bold text-blue-darken-3">{{ item.Nomor }}</span>
      </template>

      <template #item.MklNomor="{ item }">
        <span class="font-weight-medium">{{ item.MklNomor }}</span>
      </template>

      <template #item.Tanggal="{ item }">
        {{ formatDateCell(item.Tanggal) }}
      </template>

      <template #item.CabPenerima="{ item }">
        <span>{{ item.CabPenerima }}</span>
        <span v-if="item.NamaCabPenerima" class="text-caption text-grey-darken-1"> ({{ item.NamaCabPenerima }})</span>
      </template>

      <template #item.TotalTerima="{ item }">
        <span class="font-weight-bold text-success">{{ formatNumber(item.TotalTerima) }}</span>
      </template>

      <template #item.TotalBs="{ item }">
        <span class="text-error font-weight-medium">{{ formatNumber(item.TotalBs) }}</span>
      </template>

      <!-- Expanded Content -->
      <template #expanded-content="{ item }">
        <div class="expand-detail pa-2">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-caption font-weight-bold text-primary">
              Rincian Item SJ: {{ item.Nomor }} (Maklon: {{ item.MklNomor }})
            </div>
            <v-btn
              size="x-small"
              color="primary"
              variant="tonal"
              @click="openPrintTab(item.Nomor)"
            >
              <v-icon start size="14">mdi-printer</v-icon> Cetak SJ Ini
            </v-btn>
          </div>

          <v-progress-linear
            v-if="historyDetailLoading[item.Nomor]"
            indeterminate
            color="primary"
            height="3"
            class="my-2"
          />

          <v-table
            v-else-if="historyDetailCache[item.Nomor]"
            density="compact"
            class="border rounded"
          >
            <thead>
              <tr class="bg-grey-lighten-3">
                <th style="width: 30px">No.</th>
                <th>Item Barang Jadi</th>
                <th class="text-right">Qty Diterima</th>
                <th class="text-right">Qty BS</th>
                <th>Satuan</th>
                <th>No. LHK</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(d, idx) in historyDetailCache[item.Nomor]"
                :key="idx"
              >
                <td>{{ idx + 1 }}</td>
                <td>
                  <div class="font-weight-medium">{{ d.KodeJadi }}</div>
                  <div class="text-caption text-grey-darken-1">{{ d.NamaJadi }}</div>
                </td>
                <td class="text-right font-weight-bold text-success">{{ formatNumber(d.QtyTerima) }}</td>
                <td class="text-right text-error">{{ formatNumber(d.QtyBs) }}</td>
                <td>{{ d.Satuan || "-" }}</td>
                <td class="text-caption">{{ d.LhkNomor || "-" }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </template>
    </BaseBrowse>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import { format, subDays, parseISO, isValid } from "date-fns";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { sjHasilMaklonService } from "@/services/sjHasilMaklonService";
import { useAuthStore } from "@/stores/authStore";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const userCab = String(authStore.user?.cab || "").replace(/-/g, "").trim().toUpperCase();

const activeTab = ref<"outstanding" | "history">("outstanding");

const filters = reactive({
  startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  search: "",
  semuaCabang: !userCab || userCab === "HO" || userCab === "ALL",
});

const isLoading = ref(false);

// Outstanding State
const outstandingItems = ref<any[]>([]);
const selectedOutstanding = ref<any[]>([]);

// History State
const historyItems = ref<any[]>([]);
const selectedHistory = ref<any[]>([]);
const expandedHistory = ref<any[]>([]);
const historyDetailCache = ref<Record<string, any[]>>({});
const historyDetailLoading = ref<Record<string, boolean>>({});

const selectedHistoryItem = computed(() => {
  if (selectedHistory.value && selectedHistory.value.length === 1) {
    return (selectedHistory.value[0] as any)?.raw || selectedHistory.value[0];
  }
  return null;
});

// Headers
const outstandingHeaders = [
  { title: "Pilih", key: "selectCol", minWidth: "60px", width: "60px", align: "center", sortable: false },
  { title: "No. Maklon", key: "MklNomor", minWidth: "150px", width: "150px" },
  { title: "Tanggal", key: "Tanggal", minWidth: "100px", width: "100px", align: "center" },
  { title: "No. LHK", key: "LhkNomor", minWidth: "170px", width: "170px" },
  { title: "Cab Asal", key: "CabAsal", minWidth: "130px", width: "130px" },
  { title: "Cab Tujuan", key: "CabTujuan", minWidth: "130px", width: "130px" },
  { title: "Item Polos", key: "KodePolos", minWidth: "180px" },
  { title: "Qty Masuk", key: "QtyMasuk", minWidth: "90px", width: "90px", align: "end" },
  { title: "Item Hasil", key: "KodeHasil", minWidth: "180px" },
  { title: "Qty Hasil", key: "QtyHasil", minWidth: "90px", width: "90px", align: "end" },
  { title: "BS/Afval", key: "BsAfval", minWidth: "90px", width: "90px", align: "end" },
  { title: "Satuan", key: "Satuan", minWidth: "70px", width: "70px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "160px" },
];

const historyHeaders = [
  { title: "No. SJ Hasil", key: "Nomor", minWidth: "170px", width: "170px" },
  { title: "No. Maklon", key: "MklNomor", minWidth: "150px", width: "150px" },
  { title: "Tanggal", key: "Tanggal", minWidth: "100px", width: "100px", align: "center" },
  { title: "Cab Penerima", key: "CabPenerima", minWidth: "130px", width: "130px" },
  { title: "Jml Item", key: "JmlItem", minWidth: "90px", width: "90px", align: "end" },
  { title: "Total Terima", key: "TotalTerima", minWidth: "110px", width: "110px", align: "end" },
  { title: "Total BS", key: "TotalBs", minWidth: "90px", width: "90px", align: "end" },
  { title: "User", key: "UserCreate", minWidth: "100px", width: "100px" },
];

// Validasi Seleksi: semua baris harus dari 1 Maklon yang sama
const distinctMklNomor = computed(() => {
  const set = new Set<string>();
  for (const r of selectedOutstanding.value) {
    const raw = (r as any)?.raw || r;
    if (raw?.MklNomor) set.add(raw.MklNomor);
  }
  return set;
});

const canBuatSj = computed(() => {
  return selectedOutstanding.value.length > 0 && distinctMklNomor.value.size === 1;
});

// Formatters
const formatDateCell = (val?: string) => {
  if (!val) return "";
  const d = parseISO(String(val));
  if (!isValid(d)) return String(val);
  return format(d, "dd-MM-yyyy");
};

const formatNumber = (val?: any) => {
  const n = Number(val);
  return Number.isFinite(n) ? n.toLocaleString("id-ID") : "0";
};

const onClearSearch = () => {
  filters.search = "";
  fetchActiveTab();
};

// API Fetching
const fetchOutstanding = async () => {
  isLoading.value = true;
  try {
    const params: any = {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    if (filters.search && filters.search.trim() !== "") params.keyword = filters.search.trim();
    if (filters.semuaCabang) params.semuaCabang = true;

    const res = await sjHasilMaklonService.getOutstanding(params);
    const data = res.data?.data ?? res.data;
    outstandingItems.value = Array.isArray(data) ? data : [];
    selectedOutstanding.value = [];
  } catch (e: any) {
    console.error("Gagal memuat outstanding:", e);
    toast.error(e.response?.data?.message || "Gagal memuat data outstanding.");
    outstandingItems.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchHistory = async () => {
  isLoading.value = true;
  try {
    const params: any = {
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
    if (filters.search && filters.search.trim() !== "") params.keyword = filters.search.trim();
    if (filters.semuaCabang) params.semuaCabang = true;

    const res = await sjHasilMaklonService.getHistory(params);
    const data = res.data?.data ?? res.data;
    historyItems.value = Array.isArray(data) ? data : [];
    selectedHistory.value = [];
  } catch (e: any) {
    console.error("Gagal memuat history:", e);
    toast.error(e.response?.data?.message || "Gagal memuat riwayat SJ.");
    historyItems.value = [];
  } finally {
    isLoading.value = false;
  }
};

const fetchActiveTab = () => {
  if (activeTab.value === "outstanding") fetchOutstanding();
  else fetchHistory();
};

watch(activeTab, fetchActiveTab);
watch(
  () => [filters.startDate, filters.endDate],
  () => {
    if (filters.startDate && filters.endDate) fetchActiveTab();
  },
);

onMounted(fetchActiveTab);

// --- Row Selection & Click Handling (Outstanding) ---
const isRowSelected = (item: any) => {
  const raw = item?.raw || item;
  const id = raw?.DtfMaklonHasilId || raw?.DtfMaklonId;
  return selectedOutstanding.value.some((s: any) => {
    const sRaw = s?.raw || s;
    return (sRaw?.DtfMaklonHasilId || sRaw?.DtfMaklonId) === id;
  });
};

const toggleSelectRow = (item: any) => {
  const raw = item?.raw || item;
  if (!raw) return;
  const id = raw?.DtfMaklonHasilId || raw?.DtfMaklonId;
  const idx = selectedOutstanding.value.findIndex((s: any) => {
    const sRaw = s?.raw || s;
    return (sRaw?.DtfMaklonHasilId || sRaw?.DtfMaklonId) === id;
  });

  if (idx >= 0) {
    selectedOutstanding.value.splice(idx, 1);
  } else {
    const currentMklNomor =
      selectedOutstanding.value[0]?.MklNomor ||
      selectedOutstanding.value[0]?.raw?.MklNomor;
    if (!currentMklNomor || currentMklNomor === raw.MklNomor) {
      selectedOutstanding.value.push(raw);
    } else {
      // Jika memilih baris dari No. Maklon yang berbeda, beralih ke Maklon baru tersebut
      selectedOutstanding.value = [raw];
    }
  }
};

const handleOutstandingRowClick = (_event: any, row: any) => {
  const item = row?.item?.raw || row?.item || row;
  if (!item) return;
  toggleSelectRow(item);
};

const handleOutstandingDblClick = (_event: any, row: any) => {
  const item = row?.item?.raw || row?.item || row;
  if (!item) return;
  selectedOutstanding.value = [item];
  goBuatSj();
};

const getOutstandingRowProps = ({ item }: any) => {
  const raw = item?.raw || item;
  const selected = isRowSelected(raw);
  return {
    class: selected ? "row-selected font-weight-medium cursor-pointer" : "cursor-pointer",
  };
};

// --- Row Selection (History) ---
const handleHistoryRowClick = (_event: any, row: any) => {
  const item = row?.item?.raw || row?.item || row;
  if (!item) return;
  const isSelected = selectedHistory.value.some(
    (s: any) => (s?.Nomor || s?.raw?.Nomor) === item.Nomor,
  );
  selectedHistory.value = isSelected ? [] : [item];
};

const getHistoryRowProps = ({ item }: any) => {
  const raw = item?.raw || item;
  const isSelected = selectedHistory.value.some(
    (s: any) => (s?.Nomor || s?.raw?.Nomor) === raw?.Nomor,
  );
  return {
    class: isSelected ? "row-selected font-weight-medium cursor-pointer" : "cursor-pointer",
  };
};

// Navigasi Buat SJ Hasil Maklon
const goInputBaru = () => {
  router.push("/mmt/sj-hasil-maklon/create");
};

const goBuatSj = () => {
  if (selectedOutstanding.value.length === 0) return;
  if (distinctMklNomor.value.size > 1) {
    toast.warning(
      `Baris yang dipilih berasal dari No. Maklon berbeda (${Array.from(distinctMklNomor.value).join(", ")}). Pilih baris dari 1 No. Maklon yang sama saja.`,
    );
    return;
  }
  const ids = selectedOutstanding.value
    .map((r: any) => {
      const raw = r?.raw || r;
      return raw?.DtfMaklonHasilId || raw?.DtfMaklonId;
    })
    .filter(Boolean)
    .join(",");

  router.push(`/mmt/sj-hasil-maklon/create?ids=${ids}`);
};

// Expand History Details
const loadHistoryDetail = async (nomor: string) => {
  if (!nomor || historyDetailCache.value[nomor] || historyDetailLoading.value[nomor]) return;
  historyDetailLoading.value[nomor] = true;
  try {
    const res = await sjHasilMaklonService.getHistoryDetail(nomor);
    historyDetailCache.value[nomor] = res.data?.data ?? res.data;
  } catch (err: any) {
    console.error(`Gagal memuat detail ${nomor}:`, err);
  } finally {
    historyDetailLoading.value[nomor] = false;
  }
};

watch(
  expandedHistory,
  (newExpanded) => {
    if (Array.isArray(newExpanded)) {
      newExpanded.forEach((itemOrNomor: any) => {
        const no = typeof itemOrNomor === "string" ? itemOrNomor : itemOrNomor?.Nomor;
        if (no) loadHistoryDetail(no);
      });
    }
  },
  { deep: true },
);

// Print
const openPrintTab = (nomor: string) => {
  const url = router.resolve({
    name: 'SjHasilMaklonMmtPrint',
    params: { nomor },
  }).href;
  window.open(url, "_blank");
};

const handlePrintHistory = () => {
  const item = selectedHistoryItem.value;
  if (!item?.Nomor) {
    toast.warning("Pilih baris SJ Hasil Maklon terlebih dahulu.");
    return;
  }
  openPrintTab(item.Nomor);
};
</script>

<style scoped>
.sjhm-wrapper {
  padding: 0;
}
.compact-search-field :deep(.v-field) {
  font-size: 12px;
}
.expand-detail {
  background-color: #fafafa;
  border-left: 3px solid #1976d2;
}
:deep(.cursor-pointer) {
  cursor: pointer !important;
}
:deep(tr.row-selected),
:deep(tr.row-selected td) {
  background-color: #e3f2fd !important;
}
</style>
