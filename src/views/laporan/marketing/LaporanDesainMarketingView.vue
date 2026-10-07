<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { laporanDesainMarketingService as svc } from "@/services/laporan/marketing/laporanDesainMarketingService";
import { permintaanDesainService as pdSvc } from "@/services/penjualan/permintaanDesainService";
import { exportExcel } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconTable } from "@tabler/icons-vue";

const today = new Date();
const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dtAwal = ref(formatDateLocal(firstDay));
const dtAkhir = ref(formatDateLocal(today));
const filterDesainer = ref("");
const filterJenis = ref("");
const filterStatus = ref("");

const filterState = ref({
  startDate: dtAwal.value,
  endDate: dtAkhir.value,
});

watch(
  filterState,
  (newVal) => {
    if (newVal.startDate) dtAwal.value = newVal.startDate;
    if (newVal.endDate) dtAkhir.value = newVal.endDate;
  },
  { deep: true },
);

interface DesainerOption {
  Kode: string;
  Nama: string;
}
const desainerOptions = ref<DesainerOption[]>([]);

const fetchApi = async () => {
  const response = await svc.getReport({
    startDate: filterState.value.startDate,
    endDate: filterState.value.endDate,
    desainer: filterDesainer.value || undefined,
    jenisPekerjaan: filterJenis.value || undefined,
    status: filterStatus.value || undefined,
  });
  return response.data?.data || [];
};

const { items, isLoading, fetchData } = useBrowse({
  menuId: "316",
  fetchApi,
  immediate: false,
});

const summaryItems = ref<any[]>([]);
const isLoadingSummary = ref(false);
const showRekapDialog = ref(false);

const fetchSummary = async () => {
  isLoadingSummary.value = true;
  try {
    const response = await svc.getSummary({
      startDate: filterState.value.startDate,
      endDate: filterState.value.endDate,
      desainer: filterDesainer.value || undefined,
      jenisPekerjaan: filterJenis.value || undefined,
      status: filterStatus.value || undefined,
    });
    summaryItems.value = response.data?.data || [];
  } finally {
    isLoadingSummary.value = false;
  }
};

const fetchAll = () => {
  fetchData();
  fetchSummary();
};

const loadLookups = async () => {
  try {
    const res = await pdSvc.getDesainerOptions();
    desainerOptions.value = res.data.data ?? [];
  } catch {
    /* silent */
  }
};

onMounted(async () => {
  await loadLookups();
  fetchAll();
});

watch([dtAwal, dtAkhir, filterDesainer, filterJenis, filterStatus], () => {
  filterState.value.startDate = dtAwal.value;
  filterState.value.endDate = dtAkhir.value;
  fetchAll();
});

const summaryTotal = computed(() => {
  return summaryItems.value.reduce(
    (acc, r) => {
      acc.JumlahTot += Number(r.JumlahTot) || 0;
      acc.Acc += Number(r.Acc) || 0;
      acc.Progress += Number(r.Progress) || 0;
      acc.Belum += Number(r.Belum) || 0;
      acc.Pending += Number(r.Pending) || 0;
      acc.Cancel += Number(r.Cancel) || 0;
      acc.CancelAlt += Number(r.CancelAlt) || 0;
      return acc;
    },
    {
      JumlahTot: 0,
      Acc: 0,
      Progress: 0,
      Belum: 0,
      Pending: 0,
      Cancel: 0,
      CancelAlt: 0,
    },
  );
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Nama Project", key: "NamaProject", minWidth: "180px" },
  { title: "Customer", key: "Customer", minWidth: "160px" },
  { title: "Jenis", key: "JenisPekerjaan", width: "90px" },
  { title: "Desainer", key: "Desainer", width: "130px" },
  { title: "Marketing", key: "Marketing", width: "120px" },
  { title: "Jml", key: "Jml", width: "60px", align: "end" },
  { title: "Acc", key: "Acc", width: "60px", align: "end" },
  { title: "Progress", key: "Progress", width: "70px", align: "end" },
  { title: "Belum", key: "Belum", width: "60px", align: "end" },
  { title: "Pending", key: "Pending", width: "70px", align: "end" },
  { title: "Cancel", key: "Cancel", width: "70px", align: "end" },
  { title: "Cancel Alt", key: "CancelAlt", width: "80px", align: "end" },
  { title: "Status", key: "Status", width: "100px" },
  { title: "No. LHK", key: "LhkNomor", minWidth: "170px" },
  { title: "SO/MAP", key: "SoMap", width: "150px" },
];

interface LaporanRow {
  Acc: number | string;
  Progress: number | string;
  Belum: number | string;
  Pending: number | string;
  Cancel: number | string;
  CancelAlt: number | string;
}

// Urutan = prioritas saat jumlah seri (yang butuh perhatian menang)
const BUCKETS = [
  { key: "Belum", cls: "row-belum" },
  { key: "Progress", cls: "row-progress" },
  { key: "Pending", cls: "row-pending" },
  { key: "Cancel", cls: "row-cancel" },
  { key: "CancelAlt", cls: "row-cancelalt" },
  { key: "Acc", cls: "row-acc" },
] as const;

const rowPropsFn = (arg: LaporanRow | { item: LaporanRow }) => {
  const row = "item" in arg ? arg.item : arg;
  let best = 0;
  let cls = "";
  for (const b of BUCKETS) {
    const v = Number(row[b.key]) || 0;
    if (v > best) {
      best = v;
      cls = b.cls;
    }
  }
  return cls ? { class: cls } : {};
};

// ── Export Excel multi-sheet: per desainer + Total Semua ──
const isExporting = ref(false);

const onExport = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const byDesainer: Record<string, any[]> = {};
    items.value.forEach((r: any) => {
      const key = r.Desainer || "(Belum Ditugaskan)";
      if (!byDesainer[key]) byDesainer[key] = [];
      byDesainer[key].push(r);
    });

    const detailCols = [
      { header: "Tanggal", key: "Tanggal", width: 12 },
      { header: "Nama Project", key: "NamaProject", width: 28 },
      { header: "Customer", key: "Customer", width: 22 },
      { header: "Marketing", key: "Marketing", width: 14 },
      { header: "Jenis Pekerjaan", key: "JenisPekerjaan", width: 14 },
      { header: "Jumlah", key: "Jml", width: 10, align: "right" },
      { header: "Acc", key: "Acc", width: 8, align: "right" },
      { header: "Progress", key: "Progress", width: 9, align: "right" },
      { header: "Belum", key: "Belum", width: 8, align: "right" },
      { header: "Pending", key: "Pending", width: 8, align: "right" },
      { header: "Cancel", key: "Cancel", width: 8, align: "right" },
      { header: "Cancel Alt", key: "CancelAlt", width: 10, align: "right" },
      { header: "No. LHK", key: "LhkNomor", width: 26 },
      { header: "SO/MAP", key: "SoMap", width: 20 },
      { header: "Keterangan", key: "Keterangan", width: 30 },
    ];

    const sheets = Object.entries(byDesainer).map(([desainer, rows]) => ({
      sheetName: desainer.substring(0, 31),
      title: `RINCIAN DESAIN ${desainer.toUpperCase()}`,
      columns: detailCols,
      rows,
    }));

    sheets.push({
      sheetName: "Total Semua",
      title: "RINCIAN TOTAL SEMUA",
      columns: [
        { header: "Desainer", key: "Desainer", width: 18 },
        { header: "Marketing", key: "Marketing", width: 16 },
        { header: "Jumlah Tot", key: "JumlahTot", width: 12, align: "right" },
        { header: "Acc", key: "Acc", width: 10, align: "right" },
        { header: "Progress", key: "Progress", width: 10, align: "right" },
        { header: "Belum", key: "Belum", width: 10, align: "right" },
        { header: "Pending", key: "Pending", width: 10, align: "right" },
        { header: "Cancel", key: "Cancel", width: 10, align: "right" },
        { header: "Cancel Alt", key: "CancelAlt", width: 12, align: "right" },
      ],
      rows: [
        ...summaryItems.value,
        {
          Desainer: "TOTAL",
          Marketing: "",
          ...summaryTotal.value,
        },
      ],
    });

    await exportExcel(
      `Laporan_Desain_Marketing_${dtAwal.value}_${dtAkhir.value}.xlsx`,
      sheets,
    );
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan Desain Marketing"
    menu-id="316"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    v-model:filter-state="filterState"
    can-export
    :loading="isExporting"
    @export="onExport"
    @refresh="fetchAll"
  >
    <template #filter-left>
      <div class="filter-group">
        <input type="date" v-model="dtAwal" class="date-inp" />
        <span class="filter-sep">s.d</span>
        <input type="date" v-model="dtAkhir" class="date-inp" />

        <select v-model="filterDesainer" class="date-inp select-inp">
          <option value="">- Semua Desainer -</option>
          <option v-for="d in desainerOptions" :key="d.Kode" :value="d.Kode">
            {{ d.Nama }}
          </option>
        </select>

        <select v-model="filterJenis" class="date-inp select-inp">
          <option value="">- Semua Jenis -</option>
          <option value="BARU">Baru</option>
          <option value="REVISI">Revisi</option>
          <option value="CEK">Cek</option>
          <option value="PLOTTER">Plotter</option>
          <option value="EDIT">Edit</option>
        </select>

        <select v-model="filterStatus" class="date-inp select-inp">
          <option value="">- Semua Status -</option>
          <option value="OPEN">Open</option>
          <option value="PROGRESS">Progress</option>
          <option value="DONE">Done</option>
          <option value="CLOSE">Close</option>
          <option value="PENDING">Pending</option>
          <option value="CANCEL">Cancel</option>
          <option value="CANCEL_ALT">Cancel Alt</option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="indigo"
        variant="outlined"
        @click="showRekapDialog = true"
      >
        <template #prepend><IconTable :size="15" /></template>
        Rekap per Desainer
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Acc="{ item }">
      <span :class="{ 'num-acc': Number(item.Acc) > 0 }">{{ item.Acc }}</span>
    </template>
    <template #item.Progress="{ item }">
      <span :class="{ 'num-progress': Number(item.Progress) > 0 }">{{
        item.Progress
      }}</span>
    </template>
    <template #item.Belum="{ item }">
      <span :class="{ 'num-belum': Number(item.Belum) > 0 }">{{
        item.Belum
      }}</span>
    </template>
    <template #item.Pending="{ item }">
      <span :class="{ 'num-pending': Number(item.Pending) > 0 }">{{
        item.Pending
      }}</span>
    </template>
    <template #item.Cancel="{ item }">
      <span :class="{ 'num-cancel': Number(item.Cancel) > 0 }">{{
        item.Cancel
      }}</span>
    </template>
    <template #item.CancelAlt="{ item }">
      <span :class="{ 'num-cancelalt': Number(item.CancelAlt) > 0 }">{{
        item.CancelAlt
      }}</span>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showRekapDialog" max-width="900px">
    <v-card class="rounded-lg">
      <v-card-title
        class="pa-3 bg-primary text-white"
        style="font-size: 13px; font-weight: 700"
      >
        Rekap per Desainer
      </v-card-title>
      <v-card-text class="pa-4">
        <table class="rekap-table">
          <thead>
            <tr>
              <th>Desainer</th>
              <th>Marketing</th>
              <th class="tr">Jumlah</th>
              <th class="tr">Acc</th>
              <th class="tr">Progress</th>
              <th class="tr">Belum</th>
              <th class="tr">Pending</th>
              <th class="tr">Cancel</th>
              <th class="tr">Cancel Alt</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in summaryItems" :key="i">
              <td>{{ r.Desainer }}</td>
              <td>{{ r.Marketing }}</td>
              <td class="tr">{{ r.JumlahTot }}</td>
              <td class="tr">{{ r.Acc }}</td>
              <td class="tr">{{ r.Progress }}</td>
              <td class="tr">{{ r.Belum }}</td>
              <td class="tr">{{ r.Pending }}</td>
              <td class="tr">{{ r.Cancel }}</td>
              <td class="tr">{{ r.CancelAlt }}</td>
            </tr>
            <tr v-if="!summaryItems.length && !isLoadingSummary">
              <td colspan="9" class="tc" style="color: #999">
                Tidak ada data.
              </td>
            </tr>
          </tbody>
          <tfoot v-if="summaryItems.length">
            <tr>
              <td colspan="2" class="tr fw">TOTAL</td>
              <td class="tr fw">{{ summaryTotal.JumlahTot }}</td>
              <td class="tr fw">{{ summaryTotal.Acc }}</td>
              <td class="tr fw">{{ summaryTotal.Progress }}</td>
              <td class="tr fw">{{ summaryTotal.Belum }}</td>
              <td class="tr fw">{{ summaryTotal.Pending }}</td>
              <td class="tr fw">{{ summaryTotal.Cancel }}</td>
              <td class="tr fw">{{ summaryTotal.CancelAlt }}</td>
            </tr>
          </tfoot>
        </table>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" size="small" @click="showRekapDialog = false"
          >Tutup</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.rekap-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.rekap-table thead th {
  background: #eceff1;
  padding: 5px 8px;
  text-align: left;
  border-bottom: 2px solid #b0bec5;
}
.rekap-table tbody td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
}
.rekap-table tfoot td {
  padding: 5px 8px;
  border-top: 2px solid #b0bec5;
}
.rekap-table th.tr,
.rekap-table td.tr {
  text-align: right !important;
}
.tc {
  text-align: center;
}
.fw {
  font-weight: 700;
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.filter-sep {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding: 0 4px;
}
.date-inp {
  height: 30px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  outline: none;
  cursor: pointer;
}
.date-inp:focus {
  border-color: rgb(var(--v-theme-primary));
}
.select-inp {
  min-width: 140px;
}
:deep(tr.row-acc td) {
  color: #2e7d32 !important;
}
:deep(tr.row-progress td) {
  color: #1565c0 !important;
}
:deep(tr.row-belum td) {
  color: #ef6c00 !important;
}
:deep(tr.row-pending td) {
  color: #7b1fa2 !important;
}
:deep(tr.row-cancel td) {
  color: #c62828 !important;
}
:deep(tr.row-cancelalt td) {
  color: #6d4c41 !important;
}
.num-acc {
  color: #2e7d32;
  font-weight: 700;
}
.num-progress {
  color: #1565c0;
  font-weight: 700;
}
.num-belum {
  color: #ef6c00;
  font-weight: 700;
}
.num-pending {
  color: #7b1fa2;
  font-weight: 700;
}
.num-cancel {
  color: #c62828;
  font-weight: 700;
}
.num-cancelalt {
  color: #6d4c41;
  font-weight: 700;
}
</style>
