<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { planningSpkService } from "@/services/ppic/planningSpkService";
import {
  IconCalendarStats,
  IconLock,
  IconLockOpen,
  IconFileExport,
} from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BrowseItem {
  Nomor: string;
  TglAwal: string;
  TglAkhir: string;
  Cabang: string;
  Close: string;
  Keterangan: string;
}
interface DetailRow {
  NomorSPK: string;
  NamaSPK: string;
  TglJadwal: string;
  Wip: number;
  QtyPo: number;
  QtyJadwal: number;
  LineKelompok: string;
}
interface DetailCache {
  cutting: DetailRow[];
  sewing: DetailRow[];
  koli: DetailRow[];
}

// ─── Router / Toast ───────────────────────────────────────────────────────────
const router = useRouter();
const toast = useToast();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const getMondayOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon;
};

const today = new Date();
const monday = getMondayOfWeek(today);
const saturday = new Date(monday);
saturday.setDate(monday.getDate() + 5);

// ─── Filter ───────────────────────────────────────────────────────────────────
const filterState = ref({
  start: toLocalDate(monday),
  end: toLocalDate(saturday),
});

const filterStart = computed({
  get: () => filterState.value.start,
  set: (v) => {
    filterState.value = { ...filterState.value, start: v };
  },
});
const filterEnd = computed({
  get: () => filterState.value.end,
  set: (v) => {
    filterState.value = { ...filterState.value, end: v };
  },
});

const hariStart = computed(() => {
  if (!filterStart.value) return "";
  return HARI[new Date(filterStart.value + "T00:00:00").getDay()];
});
const hariEnd = computed(() => {
  if (!filterEnd.value) return "";
  return HARI[new Date(filterEnd.value + "T00:00:00").getDay()];
});

const onFilterStateRestored = (state: Record<string, any>) => {
  if (state.start) filterState.value.start = state.start;
  if (state.end) filterState.value.end = state.end;
};

// Auto-adjust Sabtu saat pilih Senin
watch(filterStart, (val) => {
  if (!val) return;
  const d = new Date(val + "T00:00:00");
  if (d.getDay() === 1) {
    const sat = new Date(d);
    sat.setDate(d.getDate() + 5);
    filterEnd.value = toLocalDate(sat);
  }
});

// ─── State ────────────────────────────────────────────────────────────────────
const items = ref<BrowseItem[]>([]);
const isLoading = ref(false);
const selected = ref<BrowseItem[]>([]);
const expandedRows = ref<BrowseItem[]>([]);
const detailCache = ref<Record<string, DetailCache>>({});
const detailLoading = ref<Set<string>>(new Set());

// expand tab state per nomor
const expandTab = ref<Record<string, string>>({});

const showCloseDialog = ref(false);
const showOpenDialog = ref(false);
const showDeleteDialog = ref(false);
const isActioning = ref(false);
const selectedItem = ref<BrowseItem | null>(null);

// ─── Headers ──────────────────────────────────────────────────────────────────
const headers = [
  { title: "NOMOR", key: "Nomor", width: "200px" },
  { title: "TGL AWAL", key: "TglAwal", width: "100px", align: "center" },
  { title: "TGL AKHIR", key: "TglAkhir", width: "100px", align: "center" },
  { title: "CABANG", key: "Cabang", width: "70px", align: "center" },
  { title: "STATUS", key: "Close", width: "80px", align: "center" },
  { title: "JML SPK", key: "JumlahSPK", width: "80px", align: "center" },
  { title: "KETERANGAN", key: "Keterangan", width: "300px" },
];

// ─── Fetch ────────────────────────────────────────────────────────────────────
let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  filterState,
  () => {
    expandedRows.value = [];
    detailCache.value = {};
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(fetchData, 400);
  },
  { deep: true },
);

const fetchData = async () => {
  isLoading.value = true;
  selected.value = [];
  expandedRows.value = [];
  detailCache.value = {};
  try {
    const res = await planningSpkService.getBrowse({
      startDate: filterStart.value,
      endDate: filterEnd.value,
    });
    items.value = res.data.data ?? [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data");
  } finally {
    isLoading.value = false;
  }
};

// ─── Expand ───────────────────────────────────────────────────────────────────
const handleExpand = async (newExpanded: BrowseItem[]) => {
  const added = newExpanded.find((i) => !expandedRows.value.includes(i));
  expandedRows.value = newExpanded;
  if (!added) return;

  const nomor = added.Nomor;
  if (detailCache.value[nomor]) return;

  detailLoading.value = new Set([...detailLoading.value, nomor]);
  // default tab
  if (!expandTab.value[nomor]) expandTab.value[nomor] = "cutting";

  try {
    const res = await planningSpkService.getDetail(nomor);
    detailCache.value = {
      ...detailCache.value,
      [nomor]: res.data.data ?? { cutting: [], sewing: [], koli: [] },
    };
  } catch {
    toast.error(`Gagal memuat detail ${nomor}`);
  } finally {
    const s = new Set(detailLoading.value);
    s.delete(nomor);
    detailLoading.value = s;
  }
};

// ─── Row props ────────────────────────────────────────────────────────────────
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Close === "Y") return { class: "text-grey-darken-1" };
  return {};
};

// ─── Actions ──────────────────────────────────────────────────────────────────
const handleAdd = () => router.push("/ppic/planning-spk/create");
const handleEdit = (item: BrowseItem) =>
  router.push(`/ppic/planning-spk/edit/${encodeURIComponent(item.Nomor)}`);

const openCloseDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  if (selectedItem.value.Close === "Y") {
    toast.warning("Sudah Close.");
    return;
  }
  showCloseDialog.value = true;
};
const openOpenDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  if (selectedItem.value.Close === "N") {
    toast.warning("Sudah Open.");
    return;
  }
  showOpenDialog.value = true;
};
const openDeleteDialog = () => {
  if (!selected.value.length) return;
  selectedItem.value = selected.value[0];
  showDeleteDialog.value = true;
};

const confirmClose = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await planningSpkService.toggleClose(selectedItem.value.Nomor, true);
    toast.success("Planning berhasil diclose.");
    showCloseDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal close.");
  } finally {
    isActioning.value = false;
  }
};
const confirmOpen = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await planningSpkService.toggleClose(selectedItem.value.Nomor, false);
    toast.success("Planning berhasil dibuka.");
    showOpenDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal membuka.");
  } finally {
    isActioning.value = false;
  }
};
const confirmDelete = async () => {
  if (!selectedItem.value) return;
  isActioning.value = true;
  try {
    await planningSpkService.deleteData(selectedItem.value.Nomor);
    toast.success("Planning berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus.");
  } finally {
    isActioning.value = false;
  }
};

// ─── Export ───────────────────────────────────────────────────────────────────
const doExport = async (type: "master" | "detail") => {
  try {
    const params = { startDate: filterStart.value, endDate: filterEnd.value };
    const res =
      type === "master"
        ? await planningSpkService.exportMaster(params)
        : await planningSpkService.exportDetail(params);
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type === "master" ? "PlanningSpk" : "DetailPlanningSpk"}_${filterStart.value}_${filterEnd.value}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error("Gagal export.");
  }
};

const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("id-ID");

// ─── Init ─────────────────────────────────────────────────────────────────────
fetchData();
</script>

<template>
  <BaseBrowse
    title="Planning SPK PPIC"
    menu-id="56"
    :icon="IconCalendarStats"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    :expanded="expandedRows"
    @update:expanded="handleExpand"
    show-expand
    :can-insert="true"
    :can-edit="true"
    :can-delete="false"
    :can-export="true"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestored"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @export="doExport('master')"
  >
    <!-- ─── Filter ─── -->
    <template #filter-left>
      <div class="date-filter">
        <span class="f-label">Periode Minggu</span>
        <div class="date-with-day">
          <input type="date" v-model="filterStart" class="f-date" />
          <span class="f-day">{{ hariStart }}</span>
        </div>
        <span class="f-sep">sd</span>
        <div class="date-with-day">
          <input type="date" v-model="filterEnd" class="f-date" />
          <span class="f-day">{{ hariEnd }}</span>
        </div>
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          height="26"
          class="px-2"
          @click="fetchData"
          >Filter</v-btn
        >
      </div>
    </template>

    <!-- ─── Extra actions ─── -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="error"
        :disabled="!selected.length"
        @click="openDeleteDialog"
      >
        <template #prepend><IconTrash :size="15" /></template>
        Hapus
      </v-btn>
      <v-btn
        size="small"
        color="blue-grey-darken-2"
        :disabled="!selected.length"
        @click="openCloseDialog"
      >
        <template #prepend><IconLock :size="14" /></template>Close
      </v-btn>
      <v-btn
        size="small"
        color="teal-darken-2"
        :disabled="!selected.length"
        @click="openOpenDialog"
      >
        <template #prepend><IconLockOpen :size="14" /></template>Open
      </v-btn>
      <v-btn size="small" color="green-darken-2" @click="doExport('detail')">
        <template #prepend><IconFileExport :size="14" /></template>Export Detail
      </v-btn>
    </template>

    <!-- ─── Kolom Status ─── -->
    <template #item.Close="{ item }">
      <v-chip
        size="x-small"
        :color="item.Close === 'Y' ? 'grey' : 'success'"
        variant="flat"
        class="font-weight-bold"
      >
        {{ item.Close === "Y" ? "Closed" : "Open" }}
      </v-chip>
    </template>
    <template #item.TglAwal="{ item }">
      {{ formatTanggal(item.TglAwal) }}
    </template>

    <template #item.TglAkhir="{ item }">
      {{ formatTanggal(item.TglAkhir) }}
    </template>
    <template #item.JumlahOrder="{ item }">{{
      fmt(item.JumlahOrder)
    }}</template>

    <!-- ─── Expand: 3 panel divisi ─── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <!-- Loading -->
        <div v-if="detailLoading.has(item.Nomor)" class="expand-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>

        <template v-else-if="detailCache[item.Nomor]">
          <v-tabs
            v-model="expandTab[item.Nomor]"
            density="compact"
            class="expand-tabs"
          >
            <v-tab value="cutting" class="expand-tab-item"
              >Cutting
              <v-chip
                v-if="detailCache[item.Nomor].cutting.length"
                size="x-small"
                color="blue-grey"
                variant="flat"
                class="ml-1"
              >
                {{ detailCache[item.Nomor].cutting.length }}
              </v-chip>
            </v-tab>
            <v-tab value="sewing" class="expand-tab-item"
              >Sewing
              <v-chip
                v-if="detailCache[item.Nomor].sewing.length"
                size="x-small"
                color="green"
                variant="flat"
                class="ml-1"
              >
                {{ detailCache[item.Nomor].sewing.length }}
              </v-chip>
            </v-tab>
            <v-tab value="koli" class="expand-tab-item"
              >Koli
              <v-chip
                v-if="detailCache[item.Nomor].koli.length"
                size="x-small"
                color="orange"
                variant="flat"
                class="ml-1"
              >
                {{ detailCache[item.Nomor].koli.length }}
              </v-chip>
            </v-tab>
          </v-tabs>

          <v-tabs-window v-model="expandTab[item.Nomor]">
            <!-- Cutting -->
            <v-tabs-window-item value="cutting">
              <table class="dt">
                <thead>
                  <tr class="thead-cutting">
                    <th>Nomor SPK</th>
                    <th>Nama SPK</th>
                    <th>Tgl Jadwal</th>
                    <th class="tr">WIP</th>
                    <th class="tr">Qty PO</th>
                    <th class="tr">Qty Jadwal</th>
                    <th>Line/Kelompok</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in detailCache[item.Nomor].cutting"
                    :key="i"
                  >
                    <td class="mono">{{ d.NomorSPK }}</td>
                    <td>{{ d.NamaSPK || "—" }}</td>
                    <td>{{ formatTanggal(d.TglJadwal) }}</td>
                    <td class="tr">{{ fmt(d.Wip) }}</td>
                    <td class="tr">{{ fmt(d.QtyPo) }}</td>
                    <td class="tr fw">{{ fmt(d.QtyJadwal) }}</td>
                    <td>{{ d.LineKelompok || "—" }}</td>
                  </tr>
                  <tr v-if="!detailCache[item.Nomor].cutting.length">
                    <td colspan="5" class="empty-row">
                      Tidak ada data cutting
                    </td>
                  </tr>
                </tbody>
              </table>
            </v-tabs-window-item>

            <!-- Sewing -->
            <v-tabs-window-item value="sewing">
              <table class="dt">
                <thead>
                  <tr class="thead-sewing">
                    <th>Nomor SPK</th>
                    <th>Nama SPK</th>
                    <th>Tgl Jadwal</th>
                    <th class="tr">WIP</th>
                    <th class="tr">Qty PO</th>
                    <th class="tr">Qty Jadwal</th>
                    <th>Line/Kelompok</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(d, i) in detailCache[item.Nomor].sewing" :key="i">
                    <td class="mono">{{ d.NomorSPK }}</td>
                    <td>{{ d.NamaSPK || "—" }}</td>
                    <td>{{ formatTanggal(d.TglJadwal) }}</td>
                    <td class="tr">{{ fmt(d.Wip) }}</td>
                    <td class="tr">{{ fmt(d.QtyPo) }}</td>
                    <td class="tr fw">{{ fmt(d.QtyJadwal) }}</td>
                    <td>{{ d.LineKelompok || "—" }}</td>
                  </tr>
                  <tr v-if="!detailCache[item.Nomor].sewing.length">
                    <td colspan="5" class="empty-row">Tidak ada data sewing</td>
                  </tr>
                </tbody>
              </table>
            </v-tabs-window-item>

            <!-- Koli -->
            <v-tabs-window-item value="koli">
              <table class="dt">
                <thead>
                  <tr class="thead-koli">
                    <th>Nomor SPK</th>
                    <th>Nama SPK</th>
                    <th>Tgl Jadwal</th>
                    <th class="tr">WIP</th>
                    <th class="tr">Qty PO</th>
                    <th class="tr">Qty Jadwal</th>
                    <th>Line/Kelompok</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(d, i) in detailCache[item.Nomor].koli" :key="i">
                    <td class="mono">{{ d.NomorSPK }}</td>
                    <td>{{ d.NamaSPK || "—" }}</td>
                    <td>{{ formatTanggal(d.TglJadwal) }}</td>
                    <td class="tr">{{ fmt(d.Wip) }}</td>
                    <td class="tr">{{ fmt(d.QtyPo) }}</td>
                    <td class="tr fw">{{ fmt(d.QtyJadwal) }}</td>
                    <td>{{ d.LineKelompok || "—" }}</td>
                  </tr>
                  <tr v-if="!detailCache[item.Nomor].koli.length">
                    <td colspan="5" class="empty-row">Tidak ada data koli</td>
                  </tr>
                </tbody>
              </table>
            </v-tabs-window-item>
          </v-tabs-window>
        </template>

        <div v-else class="expand-empty">Tidak ada data detail.</div>
      </div>
    </template>
  </BaseBrowse>

  <!-- ─── Dialog Close ─── -->
  <v-dialog v-model="showCloseDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-blue-grey-darken-2 text-white pa-3 text-subtitle-1"
      >
        Konfirmasi Close Planning
      </v-card-title>
      <v-card-text class="pa-4">
        Yakin ingin menutup planning <b>{{ selectedItem?.Nomor }}</b
        >?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showCloseDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="blue-grey-darken-2"
          variant="elevated"
          :loading="isActioning"
          @click="confirmClose"
          >Ya, Close</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ─── Dialog Open ─── -->
  <v-dialog v-model="showOpenDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-teal-darken-2 text-white pa-3 text-subtitle-1">
        Konfirmasi Buka Planning
      </v-card-title>
      <v-card-text class="pa-4">
        Yakin ingin membuka planning <b>{{ selectedItem?.Nomor }}</b
        >?
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showOpenDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="teal-darken-2"
          variant="elevated"
          :loading="isActioning"
          @click="confirmOpen"
          >Ya, Buka</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ─── Dialog Delete ─── -->
  <v-dialog v-model="showDeleteDialog" max-width="380" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-error text-white pa-3 text-subtitle-1">
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4">
        Yakin ingin menghapus planning <b>{{ selectedItem?.Nomor }}</b
        >? Data tidak bisa dipulihkan.
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showDeleteDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="elevated"
          :loading="isActioning"
          @click="confirmDelete"
          >Ya, Hapus</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ─── Filter ─── */
.date-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px 10px;
}
.f-label {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.f-date {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #757575;
}
.date-with-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.f-day {
  font-size: 10px;
  font-weight: 700;
  color: #1565c0;
  line-height: 1;
}

/* ─── Expand ─── */
.expand-wrap {
  padding: 6px 6px 6px 48px;
  background: #eceff1;
  min-width: 0;
}
.expand-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-size: 12px;
  color: #555;
}
.expand-empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
  font-size: 11px;
}

/* ─── Tabs dalam expand ─── */
.expand-tabs {
  border-bottom: 1px solid #cfd8dc;
  background: white;
}
.expand-tab-item {
  font-size: 11px !important;
  text-transform: none !important;
  min-width: 100px !important;
  padding: 0 12px !important;
}

/* ─── Detail table ─── */
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
}
.dt thead th {
  padding: 4px 8px;
  font-weight: 700;
  font-size: 10px;
  text-align: left;
  white-space: nowrap;
  position: sticky;
  top: 0;
}
.thead-cutting th {
  background: #546e7a;
  color: white;
}
.thead-sewing th {
  background: #2e7d32;
  color: white;
}
.thead-koli th {
  background: #e65100;
  color: white;
}

.dt tbody td {
  padding: 3px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.dt tbody tr:hover td {
  background: #e8f5e9 !important;
}

.tr {
  text-align: right !important;
}
.fw {
  font-weight: bold;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 10px;
  font-size: 11px;
}

/* Override Vuetify tabs di dalam expand */
:deep(.v-tabs-window) {
  background: white;
}
:deep(.v-tabs-window-item) {
  padding: 0;
}
</style>
