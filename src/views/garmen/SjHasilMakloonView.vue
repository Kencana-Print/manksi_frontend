<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { sjHasilMakloonService } from "@/services/garmen/sjHasilMakloonService";
import { useAuthStore } from "@/stores/authStore";
import {
  IconTruckDelivery,
  IconPrinter,
  IconPlus,
  IconClock,
  IconHistory,
  IconInfoCircle,
} from "@tabler/icons-vue";

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const activeTab = ref<"outstanding" | "history">("outstanding");

const today = new Date();
const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const CABANG_LIST = ["ALL", "P01", "P02", "P04", "P05"];

const userCab = computed(() =>
  String(authStore.userCabang || authStore.user?.cabang || authStore.user?.cab || "")
    .replace(/-/g, "")
    .trim()
    .toUpperCase(),
);
const isHoOrAdmin = computed(() => {
  const c = userCab.value;
  const kode = String(authStore.user?.kode || "").toUpperCase();
  return !c || c === "HO" || c === "ALL" || kode === "ADMIN" || kode === "DEVELOPER";
});

const dtAwal = ref(firstDayOfMonth);
const dtAkhir = ref(todayStr);
const cabFilter = ref(
  !isHoOrAdmin.value && CABANG_LIST.includes(userCab.value)
    ? userCab.value
    : "ALL",
);
const keyword = ref("");

const outstandingItems = ref<any[]>([]);
const historyItems = ref<any[]>([]);
const isLoading = ref(false);
const selectedOutstanding = ref<any[]>([]);
const selectedHistory = ref<any[]>([]);

const fetchOutstanding = async () => {
  isLoading.value = true;
  try {
    const params: any = {
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
    };
    if (keyword.value && keyword.value.trim() !== "") {
      params.keyword = keyword.value.trim();
    }
    if (cabFilter.value === "ALL") {
      params.semuaCabang = true;
    } else {
      params.cab = cabFilter.value;
    }

    const res = await sjHasilMakloonService.getOutstanding(params);
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
      startDate: dtAwal.value,
      endDate: dtAkhir.value,
    };
    if (keyword.value && keyword.value.trim() !== "") {
      params.keyword = keyword.value.trim();
    }
    if (cabFilter.value === "ALL") {
      params.semuaCabang = true;
    } else {
      params.cab = cabFilter.value;
    }

    const res = await sjHasilMakloonService.getHistory(params);
    const data = res.data?.data ?? res.data;
    historyItems.value = Array.isArray(data) ? data : [];
    selectedHistory.value = [];
  } catch (e: any) {
    console.error("Gagal memuat riwayat SJ:", e);
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

const onClearSearch = () => {
  keyword.value = "";
  fetchActiveTab();
};

watch(activeTab, fetchActiveTab);
watch([dtAwal, dtAkhir, cabFilter], fetchActiveTab);
onMounted(fetchActiveTab);

// ── Guard & Seleksi: Semua baris harus dari 1 No. Maklon yang sama
const distinctMklNomor = computed(() => {
  const set = new Set<string>();
  for (const r of selectedOutstanding.value) {
    const raw = r?.raw || r;
    if (raw?.MklNomor) set.add(raw.MklNomor);
  }
  return set;
});

const canBuatSj = computed(
  () =>
    selectedOutstanding.value.length > 0 && distinctMklNomor.value.size === 1,
);

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
      // Jika memilih baris dari No. Maklon berbeda, alihkan seleksi ke Maklon baru
      selectedOutstanding.value = [raw];
    }
  }
};

const handleOutstandingRowClick = (_raw: any, rowPayload: any) => {
  const item = rowPayload?.item || rowPayload?.raw || _raw;
  if (!item) return;
  toggleSelectRow(item);
};

const handleOutstandingDblClick = (_event: any, row: any) => {
  const item = row?.item?.raw || row?.item || row;
  if (!item) return;
  selectedOutstanding.value = [item];
  goBuatSj();
};

const goBuatSj = () => {
  if (selectedOutstanding.value.length === 0) return;
  if (distinctMklNomor.value.size > 1) {
    toast.warning(
      `Baris yang dipilih berasal dari No. Maklon berbeda (${Array.from(distinctMklNomor.value).join(", ")}). ` +
        `Pilih baris dari 1 No. Maklon yang sama saja.`,
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
  router.push(`/garmen/makloon/sj-hasil-makloon/create?ids=${ids}`);
};

const goInputBaru = () => {
  router.push("/garmen/makloon/sj-hasil-makloon/create");
};

const outstandingHeaders = [
  { title: "Pilih", key: "selectCol", minWidth: "55px", width: "55px", align: "center" as const, sortable: false },
  { title: "No. Maklon", key: "MklNomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" as const },
  { title: "Sumber", key: "Sumber", width: "90px", align: "center" as const },
  { title: "No. LHK", key: "LhkNomor", width: "140px" },
  { title: "Cab Asal", key: "CabAsal", width: "140px" },
  { title: "Cab Tujuan", key: "CabTujuan", width: "140px" },
  { title: "Item Polos", key: "KodePolos", minWidth: "170px" },
  { title: "Qty Masuk", key: "QtyMasuk", width: "90px", align: "end" as const },
  { title: "Item Hasil", key: "KodeHasil", minWidth: "170px" },
  { title: "Qty Hasil", key: "QtyHasil", width: "90px", align: "end" as const },
  { title: "BS/Afval", key: "BsAfval", width: "90px", align: "end" as const },
  { title: "Satuan", key: "Satuan", width: "70px", align: "center" as const },
  { title: "Keterangan", key: "Keterangan", minWidth: "160px" },
];

const historyHeaders = [
  { title: "No. SJ", key: "Nomor", width: "170px" },
  { title: "No. Maklon", key: "MklNomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" as const },
  { title: "Cab Penerima", key: "CabPenerima", width: "160px" },
  { title: "Jml Item", key: "JmlItem", width: "80px", align: "end" as const },
  { title: "Total Terima", key: "TotalTerima", width: "110px", align: "end" as const },
  { title: "Total BS", key: "TotalBs", width: "90px", align: "end" as const },
  { title: "User", key: "UserCreate", width: "100px" },
];

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";

const tglFmt = (v: any) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// Summary Footers
const summaryColumnsOutstanding = ["QtyMasuk", "QtyHasil", "BsAfval"];
const summaryFormattersOutstanding = {
  MklNomor: () => "TOTAL :",
  QtyMasuk: (items: any[]) =>
    numFmt(items.reduce((s, r) => s + (Number(r.QtyMasuk) || 0), 0)),
  QtyHasil: (items: any[]) =>
    numFmt(items.reduce((s, r) => s + (Number(r.QtyHasil) || 0), 0)),
  BsAfval: (items: any[]) =>
    numFmt(items.reduce((s, r) => s + (Number(r.BsAfval) || 0), 0)),
};

const summaryColumnsHistory = ["TotalTerima", "TotalBs"];
const summaryFormattersHistory = {
  Nomor: () => "TOTAL :",
  TotalTerima: (items: any[]) =>
    numFmt(items.reduce((s, r) => s + (Number(r.TotalTerima) || 0), 0)),
  TotalBs: (items: any[]) =>
    numFmt(items.reduce((s, r) => s + (Number(r.TotalBs) || 0), 0)),
};

const getItemNo = (item: any) => item?.Nomor || item?.raw?.Nomor || "";

const expandedHistory = ref<any[]>([]);
const historyDetailCache = ref<Record<string, any[]>>({});
const historyDetailLoading = ref<Record<string, boolean>>({});

const onUpdateExpandedHistory = async (newExpanded: any[]) => {
  expandedHistory.value = newExpanded;
  for (const itemOrNomor of newExpanded) {
    const nomor =
      typeof itemOrNomor === "string" ? itemOrNomor : getItemNo(itemOrNomor);
    if (!nomor) continue;
    if (historyDetailCache.value[nomor] || historyDetailLoading.value[nomor]) continue;

    historyDetailLoading.value[nomor] = true;
    try {
      const res = await sjHasilMakloonService.getHistoryDetail(nomor);
      historyDetailCache.value[nomor] = res.data?.data ?? res.data;
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      historyDetailLoading.value[nomor] = false;
    }
  }
};

const handleHistoryRowClick = (_raw: any, rowPayload: any) => {
  const item = rowPayload?.item || rowPayload?.raw || _raw;
  if (!item) return;
  const isSelected = selectedHistory.value.some(
    (s: any) => (s?.Nomor || s?.raw?.Nomor) === item.Nomor,
  );
  selectedHistory.value = isSelected ? [] : [item];
};

const openPrintTab = (nomor: string) => {
  if (!nomor) return;
  const url = router.resolve({
    name: "SjHasilMakloonPrint",
    params: { nomor },
  }).href;
  window.open(url, "_blank");
};
</script>

<template>
  <div class="sjhm-page">
    <!-- Tabs Selector -->
    <v-card flat class="mb-2">
      <v-tabs
        v-model="activeTab"
        color="primary"
        density="compact"
        class="border-b"
      >
        <v-tab value="outstanding" class="font-weight-bold">
          <template #prepend>
            <IconClock :size="16" class="mr-1" />
          </template>
          Outstanding ({{ outstandingItems.length }})
        </v-tab>
        <v-tab value="history" class="font-weight-bold">
          <template #prepend>
            <IconHistory :size="16" class="mr-1" />
          </template>
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
      menu-id="182"
      :icon="IconTruckDelivery"
      :headers="outstandingHeaders"
      :items="outstandingItems"
      :is-loading="isLoading"
      v-model:selected="selectedOutstanding"
      v-model:startDate="dtAwal"
      v-model:endDate="dtAkhir"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="DtfMaklonHasilId"
      :summary-columns="summaryColumnsOutstanding"
      :summary-formatters="summaryFormattersOutstanding"
      @refresh="fetchOutstanding"
      @row-click="handleOutstandingRowClick"
      @row-dblclick="handleOutstandingDblClick"
    >
      <!-- Tip / Prepend info -->
      <template #prepend-content>
        <div class="d-flex align-center justify-space-between px-4 py-2 bg-grey-lighten-4 mb-2 rounded text-caption border">
          <div class="d-flex align-center">
            <IconInfoCircle :size="16" class="mr-2 text-primary" />
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

      <!-- Filter bar: Cabang & Cari -->
      <template #filter-left>
        <div v-if="isHoOrAdmin" class="d-flex align-center mr-2">
          <span class="text-caption font-weight-medium text-grey-darken-2 mr-2">Cabang:</span>
          <select v-model="cabFilter" class="f-inp">
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c === "ALL" ? "SEMUA CABANG" : c }}
            </option>
          </select>
        </div>
      </template>

      <template #filter-fields>
        <v-text-field
          v-model="keyword"
          label="Cari No. Maklon / Barang..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="compact-search-field mr-2"
          style="max-width: 250px"
          @keyup.enter="fetchOutstanding"
          @click:clear="onClearSearch"
        />
      </template>

      <!-- Action buttons -->
      <template #extra-actions>
        <v-btn
          color="primary"
          size="small"
          :disabled="!canBuatSj"
          @click="goBuatSj"
          class="mr-2"
        >
          <template #prepend><IconTruckDelivery :size="15" /></template>
          Buat SJ Hasil Maklon
          <span v-if="selectedOutstanding.length > 0" class="ml-1">
            ({{ selectedOutstanding.length }})
          </span>
        </v-btn>
        <v-btn
          color="success"
          size="small"
          @click="goInputBaru"
        >
          <template #prepend><IconPlus :size="15" /></template>
          Input Buat SJ Baru
        </v-btn>
      </template>

      <!-- Kolom Checkbox Seleksi -->
      <template #item.selectCol="{ item }">
        <div class="d-flex justify-center" @click.stop="toggleSelectRow(item)">
          <v-icon
            :color="isRowSelected(item) ? 'primary' : 'grey-lighten-1'"
            size="20"
            class="cursor-pointer"
          >
            {{ isRowSelected(item) ? 'mdi-checkbox-marked' : 'mdi-checkbox-blank-outline' }}
          </v-icon>
        </div>
      </template>

      <template #item.MklNomor="{ item }">
        <span class="mono font-weight-bold text-blue-darken-3">{{ item.MklNomor }}</span>
      </template>
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.Sumber="{ item }">
        <v-chip
          size="x-small"
          :color="item.Sumber === 'P05' ? 'purple-darken-1' : item.Sumber === 'P02' ? 'orange-darken-2' : 'info'"
          variant="flat"
          class="font-weight-bold"
        >
          {{ item.Sumber === 'P05' ? 'MMT' : item.Sumber === 'P02' ? 'Spanduk' : (item.Sumber || 'DTF') }}
        </v-chip>
      </template>
      <template #item.LhkNomor="{ item }">
        <span class="mono">{{ item.LhkNomor || "-" }}</span>
      </template>
      <template #item.CabAsal="{ item }">
        {{ item.CabAsal }} <span v-if="item.NamaCabAsal" class="row-subtext">({{ item.NamaCabAsal }})</span>
      </template>
      <template #item.CabTujuan="{ item }">
        {{ item.CabTujuan }} <span v-if="item.NamaCabTujuan" class="row-subtext">({{ item.NamaCabTujuan }})</span>
      </template>
      <template #item.KodePolos="{ item }">
        <div class="mono font-weight-medium">{{ item.KodePolos }}</div>
        <div class="row-subtext">{{ item.NamaPolos }}</div>
      </template>
      <template #item.KodeHasil="{ item }">
        <div class="mono font-weight-bold text-purple-darken-3">{{ item.KodeHasil }}</div>
        <div class="row-subtext">{{ item.NamaHasil }}</div>
      </template>
      <template #item.QtyMasuk="{ item }">{{ numFmt(item.QtyMasuk) }}</template>
      <template #item.QtyHasil="{ item }">
        <span class="font-weight-bold text-success">{{ numFmt(item.QtyHasil) }}</span>
      </template>
      <template #item.BsAfval="{ item }">
        <span class="text-error font-weight-medium">{{ numFmt(item.BsAfval) }}</span>
      </template>
    </BaseBrowse>

    <!-- ══════════════════════════════════════════════════════ -->
    <!-- TAB 2: RIWAYAT / HISTORY -->
    <!-- ══════════════════════════════════════════════════════ -->
    <BaseBrowse
      v-else
      title="SJ Hasil Maklon — Riwayat"
      menu-id="182"
      :icon="IconTruckDelivery"
      :headers="historyHeaders"
      :items="historyItems"
      :is-loading="isLoading"
      v-model:selected="selectedHistory"
      select-strategy="single"
      v-model:startDate="dtAwal"
      v-model:endDate="dtAkhir"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="Nomor"
      show-expand
      :expanded="expandedHistory"
      :summary-columns="summaryColumnsHistory"
      :summary-formatters="summaryFormattersHistory"
      @update:expanded="onUpdateExpandedHistory"
      @refresh="fetchHistory"
      @row-click="handleHistoryRowClick"
    >
      <template #filter-left>
        <div v-if="isHoOrAdmin" class="d-flex align-center mr-2">
          <span class="text-caption font-weight-medium text-grey-darken-2 mr-2">Cabang:</span>
          <select v-model="cabFilter" class="f-inp">
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c === "ALL" ? "SEMUA CABANG" : c }}
            </option>
          </select>
        </div>
      </template>

      <template #filter-fields>
        <v-text-field
          v-model="keyword"
          label="Cari No. SJ / No. Maklon..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          class="compact-search-field mr-2"
          style="max-width: 250px"
          @keyup.enter="fetchHistory"
          @click:clear="onClearSearch"
        />
      </template>

      <template #extra-actions>
        <v-btn
          size="small"
          color="info"
          :disabled="!selectedHistory[0]"
          @click="openPrintTab(getItemNo(selectedHistory[0]))"
        >
          <template #prepend><IconPrinter :size="15" /></template>
          Cetak SJ
        </v-btn>
      </template>

      <template #item.Nomor="{ item }">
        <span class="mono font-weight-bold text-blue-darken-3">{{ item.Nomor }}</span>
      </template>
      <template #item.MklNomor="{ item }">
        <span class="mono font-weight-medium">{{ item.MklNomor }}</span>
      </template>
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.CabPenerima="{ item }">
        {{ item.CabPenerima }}
        <span v-if="item.NamaCabPenerima" class="row-subtext">({{ item.NamaCabPenerima }})</span>
      </template>
      <template #item.JmlItem="{ item }">{{ numFmt(item.JmlItem) }}</template>
      <template #item.TotalTerima="{ item }">
        <span class="font-weight-bold text-success">{{ numFmt(item.TotalTerima) }}</span>
      </template>
      <template #item.TotalBs="{ item }">
        <span class="text-error font-weight-medium">{{ numFmt(item.TotalBs) }}</span>
      </template>

      <template #expanded-content="{ item }">
        <div class="expand-detail pa-2">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="text-caption font-weight-bold text-primary">
              Rincian Item SJ: {{ getItemNo(item) }} (Maklon: {{ item?.raw?.MklNomor || item?.MklNomor }})
            </div>
            <v-btn
              size="x-small"
              color="primary"
              variant="tonal"
              @click="openPrintTab(getItemNo(item))"
            >
              <template #prepend><IconPrinter :size="14" /></template>
              Cetak SJ Ini
            </v-btn>
          </div>

          <v-progress-linear
            v-if="historyDetailLoading[getItemNo(item)]"
            indeterminate
            color="primary"
            height="3"
            class="my-2"
          />

          <v-table
            v-else-if="historyDetailCache[getItemNo(item)]"
            density="compact"
            class="border rounded"
          >
            <thead>
              <tr class="bg-grey-lighten-3">
                <th style="width: 35px">No.</th>
                <th>Item Barang Jadi</th>
                <th class="text-right">Qty Diterima</th>
                <th class="text-right">Qty BS</th>
                <th>Satuan</th>
                <th>No. LHK</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, idx) in historyDetailCache[getItemNo(item)] || []"
                :key="idx"
              >
                <td>{{ idx + 1 }}</td>
                <td>
                  <div class="mono font-weight-medium">{{ row.KodeJadi }}</div>
                  <div class="row-subtext">{{ row.NamaJadi }}</div>
                </td>
                <td class="text-right font-weight-bold text-success">{{ numFmt(row.QtyTerima) }}</td>
                <td class="text-right text-error">{{ numFmt(row.QtyBs) }}</td>
                <td>{{ row.Satuan || "PCS" }}</td>
                <td class="text-caption mono">{{ row.LhkNomor || "-" }}</td>
              </tr>
            </tbody>
          </v-table>
        </div>
      </template>
    </BaseBrowse>
  </div>
</template>

<style scoped>
.sjhm-page {
  padding: 0;
}
.mono {
  font-family: monospace;
}
.row-subtext {
  font-size: 11px;
  color: #757575;
}
.compact-search-field :deep(.v-field) {
  font-size: 12px;
}
.f-inp {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 12px;
  background: white;
  outline: none;
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
