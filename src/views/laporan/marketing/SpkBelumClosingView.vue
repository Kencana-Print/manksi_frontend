<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  nextTick,
  onBeforeUnmount,
} from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import PivotWithFilter from "@/components/PivotWithFilter.vue";
import type ExcelJS from "exceljs";
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

// ── Headers ──
const headers = [
  { title: "Nomor SO/SPK", key: "Nomor", width: "160px" },
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
    `SO_Belum_Closing_${startDate.value}_${endDate.value}`,
    "SO Belum Closing",
    [
      { header: "Nomor SO/SPK", key: "Nomor", width: 18 },
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
    `SO Belum Closing — ${startDate.value} s.d. ${endDate.value}`,
  );
};

const pivotWithFilterRef = ref<InstanceType<typeof PivotWithFilter> | null>(
  null,
);

const onExportPivot = async () => {
  const table = await pivotWithFilterRef.value?.exportPivotToExcel?.();
  if (!table) {
    toast.warning(
      "Tidak ada hasil pivot untuk diekspor. Susun pivot dulu di panel kiri.",
    );
    return;
  }

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pivot");

  const borderThin = {
    top: { style: "thin" as const },
    left: { style: "thin" as const },
    bottom: { style: "thin" as const },
    right: { style: "thin" as const },
  };

  // ── Occupancy tracker: cell [row][col] = true kalau sudah ditempati
  // (baik ditulis langsung atau kena rowSpan/colSpan dari sel lain) ──
  const occupied = new Set<string>();
  const key = (r: number, c: number) => `${r}:${c}`;

  const nextFreeCol = (rowIdx: number, fromCol: number): number => {
    let c = fromCol;
    while (occupied.has(key(rowIdx, c))) c++;
    return c;
  };

  const markOccupied = (
    rowIdx: number,
    colIdx: number,
    rowSpan: number,
    colSpan: number,
  ) => {
    for (let r = rowIdx; r < rowIdx + rowSpan; r++) {
      for (let c = colIdx; c < colIdx + colSpan; c++) {
        occupied.add(key(r, c));
      }
    }
  };

  const writeRows = (
    rows: { text: string; colSpan: number; rowSpan: number }[][],
    rowOffset: number,
    styleFn: (cell: ExcelJS.Cell) => void,
  ) => {
    rows.forEach((row, rIdx) => {
      const absRow = rowOffset + rIdx + 1;
      const excelRow = sheet.getRow(absRow);
      let colCursor = 1;

      row.forEach((cell) => {
        // ⬅ FIX: lompat ke kolom bebas berikutnya, hindari kolom yang
        // sudah ditempati rowSpan dari baris sebelumnya
        colCursor = nextFreeCol(absRow, colCursor);

        const excelCell = excelRow.getCell(colCursor);
        excelCell.value = cell.text;
        excelCell.border = borderThin;
        styleFn(excelCell);

        markOccupied(absRow, colCursor, cell.rowSpan, cell.colSpan);

        if (cell.colSpan > 1 || cell.rowSpan > 1) {
          sheet.mergeCells(
            absRow,
            colCursor,
            absRow + cell.rowSpan - 1,
            colCursor + cell.colSpan - 1,
          );
        }
        colCursor += cell.colSpan;
      });
      excelRow.commit();
    });
  };

  // ── Header rows ──
  writeRows(table.headerRows, 0, (cell) => {
    cell.font = { bold: true, color: { argb: "FF0D47A1" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE3F2FD" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  // ── Body rows ──
  const headerRowCount = table.headerRows.length;
  writeRows(table.bodyRows, headerRowCount, (cell) => {
    const text = String(cell.value ?? "");
    const isNumeric = /^-?[\d.,]+$/.test(text.replace(/\s/g, ""));
    if (isNumeric) {
      const numericVal = Number(text.replace(/\./g, "").replace(/,/g, "."));
      if (!isNaN(numericVal)) {
        cell.value = numericVal;
        cell.numFmt = "#,##0";
      }
    }
    cell.alignment = {
      horizontal: isNumeric ? "right" : "left",
      vertical: "middle",
    };
  });

  sheet.columns.forEach((col) => {
    col.width = 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Pivot_SO_Belum_Closing_${startDate.value}_${endDate.value}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Export pivot berhasil.");
};

const chartCanvasRef = ref<HTMLCanvasElement | null>(null);
const chartType = ref<"bar" | "line">("bar");
let chartInstance: any = null;
let lastPivotTable: any = null;

const buildColumnLabels = (headerRows: any[]): string[] => {
  const occupied = new Set<string>();
  const key = (r: number, c: number) => `${r}:${c}`;
  const colTexts: Record<number, string[]> = {};

  headerRows.forEach((row, rIdx) => {
    let colCursor = 0;
    row.forEach((cell: any) => {
      while (occupied.has(key(rIdx, colCursor))) colCursor++;
      for (let r = rIdx; r < rIdx + cell.rowSpan; r++) {
        for (let c = colCursor; c < colCursor + cell.colSpan; c++) {
          occupied.add(key(r, c));
          if (cell.text) {
            if (!colTexts[c]) colTexts[c] = [];
            if (colTexts[c][colTexts[c].length - 1] !== cell.text) {
              colTexts[c].push(cell.text);
            }
          }
        }
      }
      colCursor += cell.colSpan;
    });
  });

  const maxCol = Math.max(0, ...Object.keys(colTexts).map(Number)) + 1;
  const labels: string[] = [];
  for (let c = 0; c < maxCol; c++) {
    labels.push((colTexts[c] || []).join(" / "));
  }
  return labels;
};

const rebuildChart = async (table: any) => {
  lastPivotTable = table;
  if (activeTab.value !== "chart") return;
  await nextTick();
  if (!chartCanvasRef.value || !table || !table.bodyRows.length) {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  const rowFieldCount = pivotWithFilterRef.value?.getRowFieldCount?.() ?? 1;
  const colLabels = buildColumnLabels(table.headerRows).slice(rowFieldCount);

  const parsedRows = table.bodyRows.map((row: any) => {
    const label = row
      .slice(0, rowFieldCount)
      .map((c: any) => c.text)
      .join(" / ");
    const values = row.slice(rowFieldCount).map((c: any) => {
      const n = Number(String(c.text).replace(/\./g, "").replace(/,/g, "."));
      return isNaN(n) ? 0 : n;
    });
    return {
      label,
      values,
      total: values.reduce((s: number, v: number) => s + v, 0),
    };
  });

  const top = [...parsedRows].sort((a, b) => b.total - a.total).slice(0, 20);

  const {
    Chart,
    BarController,
    LineController,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  } = await import("chart.js");
  Chart.register(
    BarController,
    LineController,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  );

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const palette = [
    { bg: "rgba(21,101,192,0.65)", border: "#1565c0" },
    { bg: "rgba(46,125,50,0.65)", border: "#2e7d32" },
    { bg: "rgba(239,108,0,0.65)", border: "#ef6c00" },
    { bg: "rgba(106,27,154,0.65)", border: "#6a1b9a" },
    { bg: "rgba(198,40,40,0.65)", border: "#c62828" },
  ];

  chartInstance = new Chart(chartCanvasRef.value, {
    type: chartType.value,
    data: {
      labels: top.map((r) => r.label),
      datasets: colLabels.map((lbl, idx) => {
        const color = palette[idx % palette.length];
        return {
          label: lbl || `Kolom ${idx + 1}`,
          data: top.map((r) => r.values[idx] ?? 0),
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1,
          fill: false,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "top" } },
      scales: {
        y: {
          ticks: {
            callback: (v: any) =>
              new Intl.NumberFormat("id-ID", { notation: "compact" }).format(
                Number(v),
              ),
          },
        },
        x: { ticks: { maxRotation: 35, font: { size: 10 } } },
      },
    },
  });
};

const onPivotChanged = (table: any) => {
  rebuildChart(table);
};

watch(activeTab, async (tab) => {
  if (tab === "chart" && lastPivotTable) {
    await rebuildChart(lastPivotTable);
  }
});
watch(chartType, () => {
  if (lastPivotTable) rebuildChart(lastPivotTable);
});

onBeforeUnmount(() => {
  if (chartInstance) chartInstance.destroy();
});
</script>

<template>
  <PageLayout
    title="SO Belum Closing"
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
          :summary-columns="[
            'QtyOrder',
            'QtyKirim',
            'QtyJadi',
            'Nominal_Order',
            'Nominal_Kirim',
            'Nominal_Jadi',
            'Nominal_Selisih',
          ]"
        >
          <template #item.Tanggal="{ item }">
            {{ item.Tanggal?.replace(/-/g, "/") }}
          </template>
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
          <!-- Hapus seluruh blok #summary-row yang lama -->
        </BaseTable>
      </div>

      <!-- ── Pivot ── -->
      <div v-show="activeTab === 'pivot'" class="tab-content pivot-wrap">
        <div v-if="!items.length && !isLoading" class="empty-hint">
          Tampilkan data terlebih dahulu.
        </div>
        <template v-else>
          <div class="pivot-export-bar">
            <v-btn
              size="small"
              color="green"
              variant="tonal"
              @click="onExportPivot"
            >
              <template #prepend>
                <IconFileSpreadsheet :size="14" :stroke-width="1.7" />
              </template>
              Export Pivot Ini
            </v-btn>
          </div>
          <PivotWithFilter
            ref="pivotWithFilterRef"
            :data="items"
            :filterable-columns="[
              'Divisi',
              'Sales',
              'Customer',
              'Tanggal',
              'Nomor',
              'Nama',
              'Bulan',
            ]"
            :default-rows="['Customer', 'Divisi', 'Nomor']"
            :default-cols="['Bulan']"
            :default-vals="[
              { field: 'Nominal_Order', agg: 'sum' },
              { field: 'Nominal_Kirim', agg: 'sum' },
              { field: 'Nominal_Jadi', agg: 'sum' },
            ]"
            @pivot-changed="onPivotChanged"
          />
        </template>
      </div>

      <!-- ── Grafik ── -->
      <div v-show="activeTab === 'chart'" class="tab-content chart-wrap">
        <div v-if="!items.length && !isLoading" class="empty-hint">
          Tampilkan data terlebih dahulu.
        </div>
        <div v-else-if="!lastPivotTable" class="empty-hint">
          Susun pivot dulu di tab Pivot — grafik akan mengikuti otomatis.
        </div>
        <template v-else>
          <div class="chart-header">
            <span class="chart-title"
              >Grafik mengikuti susunan Pivot saat ini</span
            >
            <select v-model="chartType" class="chart-type-select">
              <option value="bar">Bar</option>
              <option value="line">Line</option>
            </select>
          </div>
          <div class="chart-canvas-wrap">
            <canvas ref="chartCanvasRef" />
          </div>
        </template>
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
  overflow: hidden;
}

.chart-wrap {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.pivot-export-bar {
  padding: 6px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  flex-shrink: 0;
}
.chart-title {
  font-size: 12px;
  font-weight: 700;
  color: #424242;
}
.chart-type-select {
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
}
.chart-canvas-wrap {
  flex: 1;
  min-height: 350px;
  position: relative;
  padding: 12px;
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
