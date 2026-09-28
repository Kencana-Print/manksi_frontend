<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import PivotWithFilter from "@/components/PivotWithFilter.vue";
import {
  listJurnalService,
  type ListJurnalRow,
} from "@/services/laporan/finance/listJurnalService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconRefresh,
  IconFileSpreadsheet,
  IconTable,
  IconChartBar,
  IconLayoutGrid,
  IconList,
} from "@tabler/icons-vue";

const MENU_ID = "969";
const authStore = useAuthStore();
const toast = useToast();

// ── Filter periode ──
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = toLocalDateStr(new Date());
const awalBulan = toLocalDateStr(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
);
const startDate = ref(awalBulan);
const endDate = ref(today);

const canFetch = computed(() => !!startDate.value && !!endDate.value);

// ── Tab ──
const activeTab = ref<"grid" | "pivot" | "chart">("grid");

// ── Data ──
const items = ref<ListJurnalRow[]>([]);
const isLoading = ref(false);
const hasSearched = ref(false);
const canExport = computed(() => authStore.can(MENU_ID, "view"));

const fetchData = async () => {
  if (!canFetch.value) {
    toast.warning("Tentukan rentang tanggal terlebih dahulu.");
    return;
  }
  isLoading.value = true;
  hasSearched.value = true;
  try {
    const res = await listJurnalService.getBrowse(
      startDate.value,
      endDate.value,
    );
    items.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

fetchData();

// ── Headers ──
const headers = [
  { title: "Bulan", key: "Bulan", width: "60px", align: "center" },
  { title: "Tahun", key: "Tahun", width: "60px", align: "center" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Nomor", key: "Nomor", width: "200px" },
  { title: "Referensi", key: "Referensi", width: "200px" },
  { title: "Account", key: "Account", width: "100px" },
  { title: "Nama Account", key: "AccountName", width: "240px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "280px" },
  { title: "Debet", key: "Debet", width: "140px", align: "right" },
  { title: "Kredit", key: "Kredit", width: "140px", align: "right" },
  { title: "Detail CC", key: "DetailCC", width: "160px" },
];

const fmt = (v: any) => new Intl.NumberFormat("id-ID").format(Number(v) || 0);
const fmtDate = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

// ── Flatten untuk Pivot/Chart (Jenis = Debet/Kredit, Nilai = nominal) ──
const flattenedItems = computed(() => {
  const result: Record<string, any>[] = [];
  for (const r of items.value) {
    const base = {
      Bulan: String(r.Bulan),
      Tahun: String(r.Tahun),
      Tanggal: r.Tanggal ?? "",
      Nomor: r.Nomor ?? "",
      Referensi: r.Referensi ?? "",
      Account: r.Account ?? "",
      AccountName: r.AccountName ?? "",
      Keterangan: r.Keterangan ?? "",
      DetailCC: r.DetailCC ?? "",
    };
    if (Number(r.Debet)) {
      result.push({ ...base, Jenis: "Debet", Nilai: Number(r.Debet) });
    }
    if (Number(r.Kredit)) {
      result.push({ ...base, Jenis: "Kredit", Nilai: Number(r.Kredit) });
    }
  }
  return result;
});

// ── Export Grid ──
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!items.value.length) return toast.warning("Tidak ada data.");
  await exportExcelSingle(
    `List_Jurnal_${startDate.value}_${endDate.value}`,
    "List Jurnal",
    [
      { header: "Bulan", key: "Bulan", width: 8, align: "center" },
      { header: "Tahun", key: "Tahun", width: 8, align: "center" },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Nomor", key: "Nomor", width: 22 },
      { header: "Referensi", key: "Referensi", width: 22 },
      { header: "Account", key: "Account", width: 14 },
      { header: "Nama Account", key: "AccountName", width: 28 },
      { header: "Keterangan", key: "Keterangan", width: 32 },
      {
        header: "Debet",
        key: "Debet",
        width: 16,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kredit",
        key: "Kredit",
        width: 16,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Detail CC", key: "DetailCC", width: 18 },
    ],
    items.value,
    `Laporan List Jurnal — ${startDate.value} s.d. ${endDate.value}`,
  );
};

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
    for (let r = rowIdx; r < rowIdx + rowSpan; r++)
      for (let c = colIdx; c < colIdx + colSpan; c++) occupied.add(key(r, c));
  };
  const writeRows = (
    rows: { text: string; colSpan: number; rowSpan: number }[][],
    rowOffset: number,
    styleFn: (cell: any) => void,
  ) => {
    rows.forEach((row, rIdx) => {
      const absRow = rowOffset + rIdx + 1;
      const excelRow = sheet.getRow(absRow);
      let colCursor = 1;
      row.forEach((cell) => {
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

  writeRows(table.headerRows, 0, (cell) => {
    cell.font = { bold: true, color: { argb: "FF0D47A1" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE3F2FD" },
    };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });
  writeRows(table.bodyRows, table.headerRows.length, (cell) => {
    const text = String(cell.value ?? "");
    const isNumeric = /^-?[\d.,]+$/.test(text.replace(/\s/g, ""));
    if (isNumeric) {
      const n = Number(text.replace(/\./g, "").replace(/,/g, "."));
      if (!isNaN(n)) {
        cell.value = n;
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
  a.download = `Pivot_List_Jurnal_${startDate.value}_${endDate.value}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Export pivot berhasil.");
};

// ── Pivot ──
const pivotWithFilterRef = ref<InstanceType<typeof PivotWithFilter> | null>(
  null,
);

// ── Chart — dibangun ulang otomatis dari tabel pivot yang disusun user ──
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
  <PageLayout title="List Jurnal" :menu-id="MENU_ID" :icon="IconList">
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
    </template>

    <div class="lj-wrap">
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
          :disabled="!canFetch"
          @click="fetchData"
        >
          <template #prepend>
            <IconRefresh :size="14" :stroke-width="1.7" />
          </template>
          Refresh
        </v-btn>

        <v-spacer />
        <div class="summary-chips">
          <span class="chip chip--blue">{{ items.length }} baris</span>
          <span class="chip chip--teal">
            Total Debet:
            <b>{{ fmt(items.reduce((s, r) => s + Number(r.Debet), 0)) }}</b>
          </span>
          <span class="chip chip--orange">
            Total Kredit:
            <b>{{ fmt(items.reduce((s, r) => s + Number(r.Kredit), 0)) }}</b>
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
          :summary-columns="['Debet', 'Kredit']"
        >
          <template #item.Tanggal="{ item }">{{
            fmtDate(item.Tanggal)
          }}</template>
          <template #item.Debet="{ item }">
            <span class="num-cell">{{
              item.Debet ? fmt(item.Debet) : ""
            }}</span>
          </template>
          <template #item.Kredit="{ item }">
            <span class="num-cell">{{
              item.Kredit ? fmt(item.Kredit) : ""
            }}</span>
          </template>
        </BaseTable>
      </div>

      <!-- ── Pivot ── -->
      <div v-show="activeTab === 'pivot'" class="tab-content pivot-wrap">
        <div v-if="!items.length && !isLoading" class="empty-hint">
          Tampilkan data terlebih dahulu.
        </div>
        <template v-else>
          <div class="pivot-export-bar">
            <span class="pivot-hint-txt">
              Field "Jenis" berisi Debet/Kredit — susun sebagai baris/kolom
              untuk membandingkan mutasi per account, referensi, atau periode.
            </span>
            <v-btn
              size="small"
              color="green"
              variant="tonal"
              @click="onExportPivot"
            >
              <template #prepend
                ><IconFileSpreadsheet :size="14" :stroke-width="1.7"
              /></template>
              Export Pivot Ini
            </v-btn>
          </div>
          <PivotWithFilter
            ref="pivotWithFilterRef"
            :data="flattenedItems"
            :filterable-columns="[
              'AccountName',
              'Account',
              'Referensi',
              'DetailCC',
              'Jenis',
              'Bulan',
              'Tahun',
              'Nomor',
            ]"
            :default-rows="['AccountName']"
            :default-cols="['Tahun', 'Bulan', 'Jenis']"
            :default-vals="[{ field: 'Nilai', agg: 'sum' }]"
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
.lj-wrap {
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
  white-space: nowrap;
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
  white-space: nowrap;
}
.chip--blue {
  background: #e3f2fd;
  color: #1565c0;
}
.chip--teal {
  background: #e0f2f1;
  color: #00695c;
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.pivot-hint-txt {
  font-size: 10.5px;
  color: #757575;
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
.num-cell {
  font-variant-numeric: tabular-nums;
}
</style>
