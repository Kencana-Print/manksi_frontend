<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import { spkBelumClosingService } from "@/services/laporan/marketing/spkBelumClosingService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconRefresh,
  IconFileSpreadsheet,
  IconX,
  IconTable,
  IconChartBar,
  IconLayoutGrid,
  IconSortDescending,
  IconClipboardX,
} from "@tabler/icons-vue";

const MENU_ID = "966";
const authStore = useAuthStore();
const toast = useToast();

// ── Filter ──
const today = new Date().toISOString().substring(0, 10);
const startDate = ref(today);
const endDate = ref(today);
const sortByNominal = ref(false);

// ── Tab ──
const activeTab = ref<"grid" | "pivot" | "chart">("grid");

// ── Data ──
const items = ref<any[]>([]);
const isLoading = ref(false);

const canExport = computed(() => authStore.can(MENU_ID, "view"));

// ── Fetch ──
const fetchData = async () => {
  isLoading.value = true;
  items.value = [];
  try {
    const res = await spkBelumClosingService.getBrowse({
      startDate: startDate.value,
      endDate: endDate.value,
      sortByNominal: sortByNominal.value ? "1" : "0",
    });
    items.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

onMounted(fetchData);

watch([startDate, endDate], () => {
  fetchData();
});

watch(activeTab, async (tab) => {
  await nextTick();
  if (tab === "pivot") renderPivot();
  if (tab === "chart") renderChart();
});

watch(items, () => {
  if (activeTab.value === "pivot") renderPivot();
  if (activeTab.value === "chart") renderChart();
});

// ── Headers ──
const headers = [
  { title: "Nomor SPK", key: "Nomor", width: "160px" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Sales", key: "Sales", width: "140px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Qty Order", key: "QtyOrder", width: "90px", align: "right" },
  { title: "Qty Kirim", key: "QtyKirim", width: "90px", align: "right" },
  { title: "Qty Jadi", key: "QtyJadi", width: "90px", align: "right" },
  { title: "Nom. Order", key: "Nominal_Order", width: "130px", align: "right" },
  { title: "Nom. Kirim", key: "Nominal_Kirim", width: "130px", align: "right" },
  { title: "Nom. Jadi", key: "Nominal_Jadi", width: "130px", align: "right" },
  {
    title: "Nom. Selisih",
    key: "Nominal_Selisih",
    width: "130px",
    align: "right",
  },
  { title: "Jml SPK", key: "Jumlah_SPK", width: "80px", align: "center" },
];

// ── Totals ──
const totalNominalOrder = computed(() =>
  items.value.reduce((s, r) => s + Number(r.Nominal_Order || 0), 0),
);
const totalNominalKirim = computed(() =>
  items.value.reduce((s, r) => s + Number(r.Nominal_Kirim || 0), 0),
);
const totalNominalSelisih = computed(() =>
  items.value.reduce((s, r) => s + Number(r.Nominal_Selisih || 0), 0),
);

const fmtNum = (n: number) =>
  new Intl.NumberFormat("id-ID").format(Math.round(n));

const shortNum = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "M";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "rb";
  return String(n);
};

// ── Row props ──
const rowPropsFn = (data: any) => {
  const selisih = Number(data.item?.Nominal_Selisih || 0);
  if (selisih >= 10_000_000) return { class: "row-danger" };
  if (selisih >= 1_000_000) return { class: "row-warn" };
  return {};
};

// ── Export ──
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!items.value.length) return toast.warning("Tidak ada data.");
  await exportExcelSingle(
    `SPK_Belum_Closing_${startDate.value}_${endDate.value}`,
    "SPK Belum Closing",
    [
      { header: "Nomor SPK", key: "Nomor", width: 18 },
      { header: "Nama", key: "Nama", width: 32 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Divisi", key: "Divisi", width: 12 },
      { header: "Sales", key: "Sales", width: 20 },
      { header: "Customer", key: "Customer", width: 30 },
      {
        header: "Qty Order",
        key: "QtyOrder",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Qty Kirim",
        key: "QtyKirim",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Qty Jadi",
        key: "QtyJadi",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Nom. Order",
        key: "Nominal_Order",
        width: 18,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Nom. Kirim",
        key: "Nominal_Kirim",
        width: 18,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Nom. Jadi",
        key: "Nominal_Jadi",
        width: 18,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Nom. Selisih",
        key: "Nominal_Selisih",
        width: 18,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Jml SPK", key: "Jumlah_SPK", width: 10, align: "center" },
    ],
    items.value,
    `SPK Belum Closing — ${startDate.value} s.d. ${endDate.value}`,
  );
};

// ── Pivot ──
const pivotEl = ref<HTMLElement | null>(null);
const renderPivot = async () => {
  await nextTick();
  if (!pivotEl.value || !items.value.length) return;
  const win = window as any;
  if (!win.jQuery || !win.jQuery.fn.pivotUI) return;
  win.jQuery(pivotEl.value).pivotUI(
    items.value,
    {
      rows: ["Customer", "Divisi", "Nomor"],
      cols: ["Bulan"],
      vals: ["Nominal_Order"],
      aggregatorName: "Sum",
      rendererName: "Table",
      unusedAttrsVertical: false,
    },
    true,
  );
};

// ── Chart ──
const chartEl = ref<HTMLElement | null>(null);
const renderChart = async () => {
  await nextTick();
  if (!chartEl.value || !items.value.length) return;
  const win = window as any;
  if (!win.jQuery || !win.jQuery.fn.pivotUI) return;
  if (!win.$.pivotUtilities?.c3_renderers) return;
  win.jQuery(chartEl.value).pivotUI(
    items.value,
    {
      rows: ["Divisi"],
      cols: ["Bulan"],
      vals: ["Nominal_Order"],
      aggregatorName: "Sum",
      rendererName: "Bar Chart",
      renderers: Object.assign(
        {},
        win.$.pivotUtilities.renderers,
        win.$.pivotUtilities.c3_renderers,
      ),
      unusedAttrsVertical: false,
    },
    true,
  );
};
</script>

<template>
  <PageLayout
    title="SPK Belum Closing"
    :menu-id="MENU_ID"
    :icon="IconClipboardX"
  >
    <template #header-actions>
      <v-btn
        size="small"
        color="green"
        :disabled="!items.length"
        @click="onExport"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
        </template>
        Export
      </v-btn>
      <v-btn size="small" variant="text" @click="$router.back()">
        <template #prepend><IconX :size="15" :stroke-width="2" /></template>
        Tutup
      </v-btn>
    </template>

    <div class="spk-closing-wrap">
      <!-- ── Filter bar ── -->
      <div class="filter-bar">
        <span class="filter-lbl">Periode:</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s.d.</span>
        <input type="date" v-model="endDate" class="date-inp" />

        <v-btn
          size="small"
          color="primary"
          :loading="isLoading"
          @click="fetchData"
        >
          <template #prepend>
            <IconRefresh :size="14" :stroke-width="1.7" />
          </template>
          Tampilkan
        </v-btn>

        <v-btn
          size="small"
          :color="sortByNominal ? 'orange' : 'default'"
          :variant="sortByNominal ? 'flat' : 'outlined'"
          @click="
            sortByNominal = !sortByNominal;
            fetchData();
          "
        >
          <template #prepend>
            <IconSortDescending :size="14" :stroke-width="1.7" />
          </template>
          Sort Nominal
        </v-btn>

        <v-spacer />

        <div class="summary-chips">
          <span class="chip chip--blue">{{ items.length }} SPK</span>
          <span class="chip chip--red">
            Order: <b>{{ shortNum(totalNominalOrder) }}</b>
          </span>
          <span class="chip chip--green">
            Kirim: <b>{{ shortNum(totalNominalKirim) }}</b>
          </span>
          <span class="chip chip--orange">
            Selisih: <b>{{ shortNum(totalNominalSelisih) }}</b>
          </span>
        </div>
      </div>

      <!-- ── Tab bar ── -->
      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'grid' }"
          @click="activeTab = 'grid'"
        >
          <IconTable :size="14" class="mr-1" />
          Grid Data
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'pivot' }"
          @click="activeTab = 'pivot'"
        >
          <IconLayoutGrid :size="14" class="mr-1" />
          Pivot
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'chart' }"
          @click="activeTab = 'chart'"
        >
          <IconChartBar :size="14" class="mr-1" />
          Grafik
        </button>
      </div>

      <!-- ── Grid Data ── -->
      <div v-show="activeTab === 'grid'" class="tab-content">
        <BaseTable
          :headers="headers"
          :items="items"
          :is-loading="isLoading"
          item-value="Nomor"
          :row-props-fn="rowPropsFn"
          summary-key="Nominal_Order"
          summary-label="Total Nom. Order"
        >
          <template #item.QtyOrder="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.QtyOrder)
            }}</span>
          </template>
          <template #item.QtyKirim="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.QtyKirim)
            }}</span>
          </template>
          <template #item.QtyJadi="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.QtyJadi)
            }}</span>
          </template>
          <template #item.Nominal_Order="{ item }">
            <span
              style="font-family: monospace; font-weight: 700; color: #1565c0"
            >
              {{ fmtNum(item.Nominal_Order) }}
            </span>
          </template>
          <template #item.Nominal_Kirim="{ item }">
            <span style="font-family: monospace; color: #2e7d32">
              {{ fmtNum(item.Nominal_Kirim) }}
            </span>
          </template>
          <template #item.Nominal_Jadi="{ item }">
            <span style="font-family: monospace; color: #00695c">
              {{ fmtNum(item.Nominal_Jadi) }}
            </span>
          </template>
          <template #item.Nominal_Selisih="{ item }">
            <span
              style="font-family: monospace; font-weight: 700"
              :style="{
                color:
                  Number(item.Nominal_Selisih) >= 10_000_000
                    ? '#c62828'
                    : Number(item.Nominal_Selisih) >= 1_000_000
                      ? '#f57f17'
                      : '#424242',
              }"
            >
              {{ fmtNum(item.Nominal_Selisih) }}
            </span>
          </template>

          <template #summary-row="{ filteredItems }">
            <div class="multi-summary-bar">
              <span class="ms-item">
                <span class="ms-lbl">Nom. Order</span>
                <span class="ms-val">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Nominal_Order || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">Nom. Kirim</span>
                <span class="ms-val ms-green">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Nominal_Kirim || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">Nom. Jadi</span>
                <span class="ms-val ms-teal">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) => s + Number(r.Nominal_Jadi || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
              <span class="ms-sep">|</span>
              <span class="ms-item">
                <span class="ms-lbl">Selisih</span>
                <span class="ms-val ms-red">
                  {{
                    fmtNum(
                      filteredItems.reduce(
                        (s: number, r: any) =>
                          s + Number(r.Nominal_Selisih || 0),
                        0,
                      ),
                    )
                  }}
                </span>
              </span>
            </div>
          </template>
        </BaseTable>
      </div>

      <!-- ── Pivot ── -->
      <div v-show="activeTab === 'pivot'" class="tab-content pivot-wrap">
        <div v-if="!items.length && !isLoading" class="empty-hint">
          Tampilkan data terlebih dahulu.
        </div>
        <div ref="pivotEl" class="pivot-container" />
      </div>

      <!-- ── Grafik ── -->
      <div v-show="activeTab === 'chart'" class="tab-content chart-wrap">
        <div v-if="!items.length && !isLoading" class="empty-hint">
          Tampilkan data terlebih dahulu.
        </div>
        <div ref="chartEl" class="chart-container" />
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.spk-closing-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 0;
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.filter-lbl {
  font-size: 12px;
  font-weight: 600;
  color: #424242;
}
.filter-sep {
  font-size: 12px;
  color: #9e9e9e;
}
.date-inp {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #424242;
  outline: none;
  height: 32px;
}
.date-inp:focus {
  border-color: #1867c0;
}

.summary-chips {
  display: flex;
  align-items: center;
  gap: 6px;
}
.chip {
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 10px;
  font-weight: 500;
}
.chip--blue {
  background: #e3f2fd;
  color: #1565c0;
}
.chip--red {
  background: #ffebee;
  color: #c62828;
}
.chip--green {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip--orange {
  background: #fff3e0;
  color: #e65100;
}

.tab-bar {
  display: flex;
  border-bottom: 2px solid #e0e0e0;
  background: white;
  flex-shrink: 0;
}
.tab-btn {
  padding: 8px 18px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #757575;
  display: flex;
  align-items: center;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition:
    color 0.15s,
    border-color 0.15s;
}
.tab-btn:hover {
  color: #1565c0;
}
.tab-btn.active {
  color: #1565c0;
  border-bottom-color: #1565c0;
}

.tab-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.pivot-wrap,
.chart-wrap {
  padding: 12px;
  background: white;
}
.pivot-container,
.chart-container {
  overflow: auto;
}
.pivot-container :deep(.pvtUi),
.chart-container :deep(.pvtUi) {
  font-size: 12px;
}

.empty-hint {
  padding: 32px;
  text-align: center;
  font-size: 12px;
  color: #9e9e9e;
}

:deep(.row-danger td) {
  background: #ffebee !important;
}
:deep(.row-warn td) {
  background: #fff8e1 !important;
}

.multi-summary-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 12px;
  background: #1565c0;
  min-width: max-content;
  height: 30px;
}
.ms-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ms-lbl {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-transform: uppercase;
}
.ms-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-family: monospace;
}
.ms-green {
  color: #a5d6a7;
}
.ms-teal {
  color: #80cbc4;
}
.ms-red {
  color: #ef9a9a;
}
.ms-sep {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}
</style>
