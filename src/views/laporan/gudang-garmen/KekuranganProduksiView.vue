<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import type ExcelJS from "exceljs";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";
import PivotWithFilter from "@/components/PivotWithFilter.vue";
import { laporanKekuranganProduksiService } from "@/services/laporan/gudang-garmen/laporanKekuranganProduksiService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconRefresh,
  IconFileSpreadsheet,
  IconX,
  IconTable,
  IconChartBar,
  IconLayoutGrid,
  IconSearch,
  IconAlertTriangle,
} from "@tabler/icons-vue";

const MENU_ID = "525";
const authStore = useAuthStore();
const toast = useToast();

// ── Filter ──
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = toLocalDateStr(new Date());
const firstDayOfYear = toLocalDateStr(new Date(new Date().getFullYear(), 0, 1));
const startDate = ref(firstDayOfYear);
const endDate = ref(today);

const isMap = ref(false);
const status = ref("ALL");
const nomorSpk = ref("");
const namaSpkTerpilih = ref("");
const namaSpk = ref("");
const komponen = ref("LL-000400");
const komponenNama = ref("");

const showSpkModal = ref(false);
const onSpkSelected = (item: any) => {
  nomorSpk.value = item.Nomor;
  namaSpkTerpilih.value = item.Nama || item.Nama2 || "";
  namaSpk.value = "";
};
const clearSpk = () => {
  nomorSpk.value = "";
  namaSpkTerpilih.value = "";
};

const showBahanModal = ref(false);
const onBahanSelected = (item: any) => {
  komponen.value = item.Kode;
  komponenNama.value = item.Nama || "";
};
const resetKomponen = () => {
  komponen.value = "LL-000400";
  komponenNama.value = "";
};

// ── Tab ──
const activeTab = ref<"grid" | "pivot" | "chart">("grid");

// ── Data ──
const items = ref<any[]>([]);
const isLoading = ref(false);
const hasSearched = ref(false);
const canExport = computed(() => authStore.can(MENU_ID, "view"));

const fetchData = async () => {
  isLoading.value = true;
  items.value = [];
  hasSearched.value = true;
  try {
    const res = await laporanKekuranganProduksiService.getBrowse({
      startDate: startDate.value,
      endDate: endDate.value,
      komponen: komponen.value,
      spk: nomorSpk.value.trim(),
      nama: namaSpk.value.trim(),
      status: status.value,
      map: isMap.value,
    });
    items.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

// ── Headers — 1 baris per (SPK, lini produksi) ──
const headers = [
  { title: "No. SPK", key: "Nomor", width: "140px" },
  { title: "Divisi", key: "Divisi", width: "80px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Kain", key: "Kain", minWidth: "160px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "80px", align: "right" },
  { title: "Kurang Kirim", key: "KurangKirim", width: "100px", align: "right" },
  { title: "Jadi", key: "Jadi", width: "80px", align: "right" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Status", key: "Closed", width: "80px", align: "center" },
  { title: "Produksi", key: "Produksi", width: "110px" },
  { title: "Sudah", key: "Sudah", width: "90px", align: "right" },
  { title: "Kurang", key: "Kurang", width: "90px", align: "right" },
  { title: "Cab", key: "Cab", width: "60px" },
];

const fmtNum = (n: any) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(
    Number(n) || 0,
  );
const fmtDate = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

const itemsWithBulan = computed(() =>
  items.value.map((r) => ({
    ...r,
    Bulan: r.Tanggal ? String(r.Tanggal).substring(0, 7) : "-",
  })),
);

// ── Flatten — Sudah & Kurang jadi 1 kolom Nilai, dibedakan lewat
// Jenis, biar bisa dibandingkan bareng di kolom pivot yang sama ──
const flattenedItems = computed(() => {
  const result: Record<string, any>[] = [];
  for (const r of itemsWithBulan.value) {
    const base = {
      Nomor: r.Nomor ?? "",
      Divisi: r.Divisi ?? "",
      Nama: r.Nama ?? "",
      Kain: r.Kain ?? "",
      Jumlah: r.Jumlah ?? 0,
      Kirim: r.Kirim ?? 0,
      KurangKirim: r.KurangKirim ?? 0,
      Jadi: r.Jadi ?? 0,
      Tanggal: r.Tanggal ?? "",
      Dateline: r.Dateline ?? "",
      Closed: r.Closed ?? "",
      Produksi: r.Produksi ?? "",
      Cab: r.Cab ?? "",
      Bulan: r.Bulan ?? "-",
    };
    const measures: [string, any][] = [
      ["Sudah", r.Sudah],
      ["Kurang", r.Kurang],
    ];
    for (const [jenis, val] of measures) {
      const n = Number(val);
      if (n) {
        result.push({ ...base, Jenis: jenis, Nilai: n });
      }
    }
  }
  return result;
});

// ── Export ──
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!items.value.length) return toast.warning("Tidak ada data.");
  await exportExcelSingle(
    `Kekurangan_Produksi_${startDate.value}_${endDate.value}`,
    "Kekurangan Produksi",
    [
      { header: "No. SPK", key: "Nomor", width: 18 },
      { header: "Divisi", key: "Divisi", width: 10 },
      { header: "Nama", key: "Nama", width: 28 },
      { header: "Kain", key: "Kain", width: 22 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang Kirim",
        key: "KurangKirim",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jadi",
        key: "Jadi",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Status", key: "Closed", width: 12, align: "center" },
      { header: "Produksi", key: "Produksi", width: 14 },
      {
        header: "Sudah",
        key: "Sudah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang",
        key: "Kurang",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Cab", key: "Cab", width: 10 },
    ],
    items.value,
    `Laporan Kekurangan Produksi — ${startDate.value} s.d. ${endDate.value}`,
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
    styleFn: (cell: ExcelJS.Cell) => void,
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
  a.download = `Pivot_Kekurangan_Produksi_${startDate.value}_${endDate.value}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Export pivot berhasil.");
};

// ── Chart reaktif — dibangun ulang otomatis setiap kali user susun
// ulang pivot, lewat event pivot-changed dari TinyPivotOnly ──
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

// ── Grafik ──
const chartEl = ref<HTMLElement | null>(null);
const renderChart = async () => {
  await nextTick();
  if (!chartEl.value || !itemsWithBulan.value.length) return;
  const win = window as any;
  if (!win.jQuery || !win.jQuery.fn.pivotUI) return;
  if (!win.$.pivotUtilities?.c3_renderers) return;
  win.jQuery(chartEl.value).pivotUI(
    itemsWithBulan.value,
    {
      rows: ["Produksi"],
      cols: ["Bulan"],
      vals: ["Kurang"],
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
    title="Laporan Kekurangan Produksi"
    :menu-id="MENU_ID"
    :icon="IconAlertTriangle"
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

    <div class="kp-wrap">
      <!-- ── Filter bar ── -->
      <div class="filter-bar">
        <span class="filter-lbl">Periode Mutasi:</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s.d.</span>
        <input type="date" v-model="endDate" class="date-inp" />

        <span class="filter-lbl ml">No. SPK:</span>
        <div class="spk-picker">
          <input
            type="text"
            :value="nomorSpk"
            readonly
            class="text-inp"
            style="width: 120px; cursor: pointer"
            placeholder="Klik untuk pilih..."
            @click="showSpkModal = true"
          />
          <button
            type="button"
            class="btn-clear-spk"
            v-if="nomorSpk"
            @click="clearSpk"
          >
            ✕
          </button>
          <button
            type="button"
            class="btn-search-spk"
            @click="showSpkModal = true"
          >
            <IconSearch :size="13" />
          </button>
        </div>
        <span v-if="namaSpkTerpilih" class="spk-nama-hint">{{
          namaSpkTerpilih
        }}</span>

        <label class="chk-lbl ml">
          <input type="checkbox" v-model="isMap" />
          <span>MAP</span>
        </label>

        <span class="filter-lbl ml">Status Closed:</span>
        <select v-model="status" class="sel-inp">
          <option value="ALL">All</option>
          <option value="SUDAH">Sudah</option>
          <option value="BELUM">Belum</option>
        </select>

        <span class="filter-lbl ml">Nama SPK:</span>
        <input
          type="text"
          v-model="namaSpk"
          class="text-inp"
          placeholder="Ketik nama..."
          style="width: 140px"
          :disabled="!!nomorSpk"
        />

        <span class="filter-lbl ml">Komponen:</span>
        <div class="spk-picker">
          <input
            type="text"
            :value="komponen"
            readonly
            class="text-inp"
            style="width: 110px; cursor: pointer"
            @click="showBahanModal = true"
          />
          <button
            type="button"
            class="btn-clear-spk"
            v-if="komponen !== 'LL-000400'"
            @click="resetKomponen"
          >
            ✕
          </button>
          <button
            type="button"
            class="btn-search-spk"
            @click="showBahanModal = true"
          >
            <IconSearch :size="13" />
          </button>
        </div>
        <span v-if="komponenNama" class="spk-nama-hint">{{
          komponenNama
        }}</span>

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

        <v-spacer />
        <div class="summary-chips">
          <span class="chip chip--blue">{{ items.length }} baris</span>
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
        <div v-if="!hasSearched" class="search-guide">
          <IconSearch :size="40" :stroke-width="1.2" color="#bdbdbd" />
          <div class="sg-title">Klik "Tampilkan" untuk memuat data</div>
          <div class="sg-sub">
            Satu baris mewakili satu kombinasi SPK dan lini produksi (Potong,
            Cetak, Bordir, Jahit, Lipat, DC, dst).
          </div>
        </div>
        <BaseTable
          v-else
          :headers="headers"
          :items="items"
          :is-loading="isLoading"
          item-value="Nomor"
          :summary-columns="[
            'Jumlah',
            'Kirim',
            'KurangKirim',
            'Jadi',
            'Sudah',
            'Kurang',
          ]"
        >
          <template #item.Jumlah="{ item }">{{ fmtNum(item.Jumlah) }}</template>
          <template #item.Kirim="{ item }">{{ fmtNum(item.Kirim) }}</template>
          <template #item.KurangKirim="{ item }">{{
            fmtNum(item.KurangKirim)
          }}</template>
          <template #item.Jadi="{ item }">{{ fmtNum(item.Jadi) }}</template>
          <template #item.Tanggal="{ item }">{{
            fmtDate(item.Tanggal)
          }}</template>
          <template #item.Dateline="{ item }">{{
            fmtDate(item.Dateline)
          }}</template>
          <template #item.Closed="{ item }">
            <span
              :class="item.Closed === 'Sudah' ? 'badge-sudah' : 'badge-belum'"
              >{{ item.Closed }}</span
            >
          </template>
          <template #item.Sudah="{ item }">{{ fmtNum(item.Sudah) }}</template>
          <template #item.Kurang="{ item }">
            <span :class="{ 'text-kurang': Number(item.Kurang) > 0 }">{{
              fmtNum(item.Kurang)
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
              Field "Jenis" berisi Sudah/Kurang — default kolom sudah disusun
              per lini Produksi.
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
              'Divisi',
              'Produksi',
              'Closed',
              'Cab',
              'Jenis',
              'Bulan',
              'Tanggal',
              'Nama',
            ]"
            :default-rows="['Nomor', 'Tanggal', 'Nama', 'Jumlah', 'Kirim']"
            :default-cols="['Produksi', 'Jenis']"
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

    <SpkSearchModal
      v-model="showSpkModal"
      filter-mode="all"
      @selected="onSpkSelected"
    />
    <BahanSearchModal
      v-model="showBahanModal"
      mode="komponen"
      @selected="onBahanSelected"
    />
  </PageLayout>
</template>

<style scoped>
.kp-wrap {
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
.filter-lbl.ml {
  margin-left: 6px;
}
.filter-sep {
  font-size: 12px;
  color: #9e9e9e;
}
.date-inp,
.sel-inp,
.text-inp {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #424242;
  outline: none;
  height: 32px;
}
.date-inp:focus,
.sel-inp:focus,
.text-inp:focus {
  border-color: #1867c0;
}
.chk-lbl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #424242;
  cursor: pointer;
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
.spk-picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  height: 32px;
}
.spk-picker .text-inp {
  border: none;
  height: 30px;
}
.btn-clear-spk {
  background: #ffebee;
  border: none;
  color: #c62828;
  font-size: 11px;
  width: 22px;
  height: 30px;
  cursor: pointer;
}
.btn-search-spk {
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #e0e0e0;
  color: #1565c0;
  width: 26px;
  height: 30px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-nama-hint {
  font-size: 11px;
  color: #757575;
  font-style: italic;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  gap: 10px;
  text-align: center;
}
.sg-title {
  font-size: 14px;
  font-weight: 700;
  color: #616161;
}
.sg-sub {
  font-size: 12px;
  color: #9e9e9e;
  max-width: 380px;
  line-height: 1.5;
}
.text-kurang {
  color: #c62828;
  font-weight: 700;
}
.badge-sudah {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}
.badge-belum {
  background: #fff3e0;
  color: #e65100;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 600;
}
</style>
