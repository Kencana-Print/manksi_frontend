<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "@/services/api";
import { targetVsAchievementService } from "@/services/laporan/marketing/targetVsAchievementService";
import TabByDivisi from "./components/TabByDivisi.vue";
import TabBySales from "./components/TabBySales.vue";
import TabSalesPerformance from "./components/TabSalesPerformance.vue";
import TabProyeksi from "./components/TabProyeksi.vue";
import { IconFileSpreadsheet, IconRefresh } from "@tabler/icons-vue";

const toast = useToast();

const BULAN_OPTIONS = [
  { value: 1, title: "01 (Januari)" },
  { value: 2, title: "02 (Februari)" },
  { value: 3, title: "03 (Maret)" },
  { value: 4, title: "04 (April)" },
  { value: 5, title: "05 (Mei)" },
  { value: 6, title: "06 (Juni)" },
  { value: 7, title: "07 (Juli)" },
  { value: 8, title: "08 (Agustus)" },
  { value: 9, title: "09 (September)" },
  { value: 10, title: "10 (Oktober)" },
  { value: 11, title: "11 (November)" },
  { value: 12, title: "12 (Desember)" },
];
const thisYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => thisYear - i);
const thisMonth = new Date().getMonth() + 1;

const filterState = ref({
  tahun: thisYear,
  bulanAwal: thisMonth,
  bulanAkhir: thisMonth,
});
const activeTab = ref("divisi");
const isLoading = ref(false);

const byDivisi = ref<any[]>([]);
const bySales = ref<any[]>([]);
const salesPerformance = ref<any[]>([]);
const proyeksi = ref<any[]>([]);

const fetchData = async () => {
  if (filterState.value.bulanAkhir < filterState.value.bulanAwal) {
    toast.warning("Periode awal tidak boleh lebih besar dari periode akhir.");
    return;
  }
  isLoading.value = true;
  try {
    const res = await targetVsAchievementService.getBrowse(
      filterState.value.tahun,
      filterState.value.bulanAwal,
      filterState.value.bulanAkhir,
    );
    const data = res.data.data;
    byDivisi.value = data.byDivisi || [];
    bySales.value = data.bySales || [];
    salesPerformance.value = data.salesPerformance || [];
    proyeksi.value = data.proyeksi || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};
onMounted(fetchData);

const reloadProyeksi = async () => {
  try {
    const res = await targetVsAchievementService.getBrowse(
      filterState.value.tahun,
      filterState.value.bulanAwal,
      filterState.value.bulanAkhir,
    );
    proyeksi.value = res.data.data.proyeksi || [];
  } catch {
    /* item sudah di-update optimis di TabProyeksi */
  }
};

const TAB_TITLES: Record<string, string> = {
  divisi: "LAPORAN TARGET ACHIEVEMENT BY DIVISI",
  sales: "LAPORAN TARGET ACHIEVEMENT BY SALES",
  performance: "LAPORAN SALES PERFORMANCE",
  proyeksi: "LAPORAN PROYEKSI SALES",
};

const BLUE = { argb: "FF1565C0" };
const PEACH = "FFFCD5B4";
const SUBTOTAL_BLUE = "FFDCE6F1";
const GRANDTOTAL_BLUE = "FFB8CCE4";
const NEG_RED = { argb: "FFC62828" };
const NEG_HIGHLIGHT_COLS = [
  "growth_rupiah",
  "growth_persen",
  "run_growth_rupiah",
  "run_growth_persen",
];

const thinBorder = {
  top: { style: "thin" as const },
  left: { style: "thin" as const },
  bottom: { style: "thin" as const },
  right: { style: "thin" as const },
};

const addCompanyHeader = (
  ws: ExcelJS.Worksheet,
  namaPerush: string,
  alamatPerush: string,
  telpPerush: string,
  judul: string,
  periode: string,
) => {
  ws.getCell(1, 1).value = namaPerush || "";
  ws.getCell(1, 1).font = { bold: true, size: 13, color: BLUE };
  ws.getCell(2, 1).value = alamatPerush || "";
  ws.getCell(2, 1).font = { bold: true, size: 10, color: BLUE };
  ws.getCell(3, 1).value = telpPerush || "";
  ws.getCell(3, 1).font = { bold: true, size: 10, color: BLUE };
  ws.getCell(5, 1).value = judul;
  ws.getCell(5, 1).font = { bold: true, size: 12, color: BLUE };
  ws.getCell(6, 1).value = periode;
  ws.getCell(6, 1).font = { bold: true, size: 10, color: BLUE };
};

const styleHeaderRow = (
  ws: ExcelJS.Worksheet,
  rowNum: number,
  lastCol: number,
  fillArgb = PEACH,
) => {
  for (let c = 1; c <= lastCol; c++) {
    const cell = ws.getCell(rowNum, c);
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: fillArgb },
    };
    cell.font = { bold: true };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = thinBorder;
  }
};

const getPerushInfo = async () => {
  let namaPerush = "",
    alamatPerush = "",
    telpPerush = "";
  try {
    const res = await api.get("/lookups/perusahaan");
    const list = res.data.data || [];
    if (list.length) {
      namaPerush = list[0].perush_nama || "";
      alamatPerush = list[0].perush_alamat || "";
      telpPerush = list[0].perush_telp || list[0].perush_telpon || "";
    }
  } catch {
    /* letterhead gagal dimuat — lanjut tanpa kop */
  }
  return { namaPerush, alamatPerush, telpPerush };
};

const periodeLabelBulan = () => {
  const awal =
    BULAN_OPTIONS.find((b) => b.value === filterState.value.bulanAwal)?.title ??
    "";
  const akhir =
    BULAN_OPTIONS.find((b) => b.value === filterState.value.bulanAkhir)
      ?.title ?? "";
  return `Periode Bulan: ${awal} s.d ${akhir} Tahun:${filterState.value.tahun}`;
};
const periodeLabelTahun = () => `Periode Tahun: ${filterState.value.tahun}`;

// ── Tab 1: By Divisi ──
const buildDivisiSheet = (
  ws: ExcelJS.Worksheet,
  info: { namaPerush: string; alamatPerush: string; telpPerush: string },
) => {
  const cols = ["Tahun", "Bulan", "Divisi", "Target", "Realisasi", "Ach(%)"];
  const lastCol = cols.length;
  addCompanyHeader(
    ws,
    info.namaPerush,
    info.alamatPerush,
    info.telpPerush,
    "LAPORAN TARGET ACHIEVEMENT BY DIVISI",
    periodeLabelBulan(),
  );
  cols.forEach((c, i) => (ws.getCell(7, i + 1).value = c));
  styleHeaderRow(ws, 7, lastCol);
  for (let c = 1; c <= lastCol; c++) ws.getCell(8, c).border = thinBorder; // baris spacer, quirk Delphi

  let jRow = 9;
  let totalTarget = 0,
    totalRealisasi = 0;
  for (const r of byDivisi.value) {
    ws.getCell(jRow, 1).value = Number(r.tahun) || 0;
    ws.getCell(jRow, 2).value = r.Bulan;
    ws.getCell(jRow, 3).value = r.Divisi;
    ws.getCell(jRow, 4).value = Number(r.Target) || 0;
    ws.getCell(jRow, 4).numFmt = '"Rp"#,##0.00';
    ws.getCell(jRow, 5).value = Number(r.Realisasi) || 0;
    ws.getCell(jRow, 5).numFmt = '"Rp"#,##0.00';
    ws.getCell(jRow, 6).value = Number(r.Ach) || 0;
    ws.getCell(jRow, 6).numFmt = '0.00"%"';
    for (let c = 1; c <= lastCol; c++) ws.getCell(jRow, c).border = thinBorder;
    totalTarget += Number(r.Target) || 0;
    totalRealisasi += Number(r.Realisasi) || 0;
    jRow++;
  }

  // Baris Total — quirk: angka POLOS tanpa numFmt (replikasi persis Delphi)
  ws.getCell(jRow, 3).value = "Total";
  ws.getCell(jRow, 4).value = totalTarget;
  ws.getCell(jRow, 5).value = totalRealisasi;
  ws.getCell(jRow, 6).value =
    totalTarget > 0
      ? Number(((totalRealisasi / totalTarget) * 100).toFixed(2))
      : 0;
  ws.getCell(jRow, 6).numFmt = '0.00"%"';
  for (let c = 1; c <= lastCol; c++) {
    const cell = ws.getCell(jRow, c);
    cell.font = { bold: true };
    cell.border = thinBorder;
  }

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 12;
};

// ── Tab 2: By Sales ──
const buildSalesSheet = (
  ws: ExcelJS.Worksheet,
  info: { namaPerush: string; alamatPerush: string; telpPerush: string },
) => {
  const cols = [
    "Tahun",
    "Bulan",
    "Kode",
    "Nama Sales",
    "Target",
    "Realisasi",
    "Ach(%)",
  ];
  const lastCol = cols.length;
  addCompanyHeader(
    ws,
    info.namaPerush,
    info.alamatPerush,
    info.telpPerush,
    "LAPORAN TARGET ACHIEVEMENT BY SALES",
    periodeLabelBulan(),
  );
  cols.forEach((c, i) => (ws.getCell(7, i + 1).value = c));
  styleHeaderRow(ws, 7, lastCol);
  for (let c = 1; c <= lastCol; c++) ws.getCell(8, c).border = thinBorder;

  let jRow = 9;
  for (const r of bySales.value) {
    ws.getCell(jRow, 1).value = Number(r.tahun) || 0;
    ws.getCell(jRow, 2).value = r.Bulan;
    ws.getCell(jRow, 3).value = r.SalKode;
    ws.getCell(jRow, 4).value = r.SalNama;
    ws.getCell(jRow, 5).value = Number(r.Target) || 0;
    ws.getCell(jRow, 5).numFmt = '"Rp"#,##0.00';
    ws.getCell(jRow, 6).value = Number(r.Realisasi) || 0;
    ws.getCell(jRow, 6).numFmt = '"Rp"#,##0.00';
    ws.getCell(jRow, 7).value = Number(r.Ach) || 0;
    ws.getCell(jRow, 7).numFmt = '0.00"%"';

    const isTotal = r.SalNama === "SUB TOTAL" || r.SalNama === "GRAND TOTAL";
    const fillArgb =
      r.SalNama === "GRAND TOTAL"
        ? GRANDTOTAL_BLUE
        : r.SalNama === "SUB TOTAL"
          ? SUBTOTAL_BLUE
          : null;
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(jRow, c);
      cell.border = thinBorder;
      if (isTotal) {
        cell.font = { bold: true };
        if (fillArgb)
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: fillArgb },
          };
      }
    }
    jRow++;
  }

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 10;
  ws.getColumn(4).width = 26;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 20;
  ws.getColumn(7).width = 12;
};

// ── Tab 3: Sales Performance ──
const PERF_NUM_COLS = [
  "target",
  "aktual",
  "ly",
  "growth_rupiah",
  "run_target",
  "run_aktual",
  "run_ly",
  "run_growth_rupiah",
  "run_proyeksi",
];
const PERF_PCT_COLS = [
  "acv",
  "yoy",
  "growth_persen",
  "run_acv",
  "run_yoy",
  "run_growth_persen",
  "persen_proyeksi",
];
const PERF_COL_ORDER = [
  "tahun",
  "nama_bulan",
  ...PERF_NUM_COLS.slice(0, 1),
  "aktual",
  "acv",
  "ly",
  "yoy",
  "growth_rupiah",
  "growth_persen",
  "run_target",
  "run_aktual",
  "run_acv",
  "run_ly",
  "run_yoy",
  "run_growth_rupiah",
  "run_growth_persen",
  "run_proyeksi",
  "persen_proyeksi",
];

const buildPerformanceSheet = (
  ws: ExcelJS.Worksheet,
  info: { namaPerush: string; alamatPerush: string; telpPerush: string },
) => {
  const lastCol = 18;
  addCompanyHeader(
    ws,
    info.namaPerush,
    info.alamatPerush,
    info.telpPerush,
    "LAPORAN SALES PERFORMANCE",
    periodeLabelTahun(),
  );

  // Band header row 7
  ws.mergeCells(7, 1, 7, 2);
  ws.getCell(7, 1).value = "Period";
  ws.mergeCells(7, 3, 7, 9);
  ws.getCell(7, 3).value = "MTD (Month to Date)";
  ws.mergeCells(7, 10, 7, 16);
  ws.getCell(7, 10).value = "YTD (Year to Date)";
  ws.mergeCells(7, 17, 7, 18);
  ws.getCell(7, 17).value = "Projected";
  styleHeaderRow(ws, 7, lastCol);

  // Sub-header row 8
  const subHeaders = [
    "Year",
    "Month",
    "Target",
    "Actual",
    "Ach (%)",
    "LY Actual",
    "YoY (%)",
    "Varince",
    "Growth (%)",
    "Target",
    "Actual",
    "Ach (%)",
    "LY Actual",
    "YoY (%)",
    "Variance",
    "Growth (%)",
    "Projected Sales",
    "Ach to Proj (%)",
  ];
  subHeaders.forEach((h, i) => (ws.getCell(8, i + 1).value = h));
  styleHeaderRow(ws, 8, lastCol, "FFFFFFFF");

  let jRow = 9;
  for (const r of salesPerformance.value) {
    ws.getCell(jRow, 1).value = Number(r.tahun) || 0;
    ws.getCell(jRow, 2).value = r.nama_bulan;
    PERF_COL_ORDER.slice(2).forEach((key, idx) => {
      const c = idx + 3;
      const cell = ws.getCell(jRow, c);
      const val = Number(r[key]) || 0;
      cell.value = val;
      cell.numFmt = PERF_PCT_COLS.includes(key) ? "0.00" : "#,##0";
      if (NEG_HIGHLIGHT_COLS.includes(key) && val < 0)
        cell.font = { color: NEG_RED };
    });

    const namaBulan = String(r.nama_bulan || "");
    const isQuarter = namaBulan.includes("QUARTER");
    const isGrand = namaBulan.startsWith("GRAND");
    if (isQuarter || isGrand) {
      const fillArgb = isGrand ? GRANDTOTAL_BLUE : SUBTOTAL_BLUE;
      for (let c = 1; c <= lastCol; c++) {
        const cell = ws.getCell(jRow, c);
        cell.font = { bold: true, color: cell.font?.color };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillArgb },
        };
      }
    }
    for (let c = 1; c <= lastCol; c++) ws.getCell(jRow, c).border = thinBorder;
    jRow++;
  }

  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 16;
  for (let c = 3; c <= lastCol; c++) ws.getColumn(c).width = 13;
};

// ── Tab 4: Proyeksi ──
const buildProyeksiSheet = (
  ws: ExcelJS.Worksheet,
  info: { namaPerush: string; alamatPerush: string; telpPerush: string },
) => {
  const lastCol = 3;
  addCompanyHeader(
    ws,
    info.namaPerush,
    info.alamatPerush,
    info.telpPerush,
    "LAPORAN PROYEKSI SALES",
    periodeLabelTahun(),
  );

  ws.mergeCells(7, 1, 7, lastCol);
  ws.getCell(7, 1).value = "PROYEKSI";
  styleHeaderRow(ws, 7, lastCol);

  ["Tahun", "Bulan", "Sales"].forEach(
    (h, i) => (ws.getCell(8, i + 1).value = h),
  );
  styleHeaderRow(ws, 8, lastCol, "FFFFFFFF");

  let jRow = 9;
  let totalSales = 0;
  for (const r of proyeksi.value) {
    ws.getCell(jRow, 1).value = Number(r.py_tahun) || 0;
    ws.getCell(jRow, 2).value = Number(r.py_bulan) || 0; // quirk: angka mentah, bukan nama bulan
    ws.getCell(jRow, 3).value = Number(r.py_sales) || 0;
    ws.getCell(jRow, 3).numFmt = '"Rp"#,##0.00';
    for (let c = 1; c <= lastCol; c++) ws.getCell(jRow, c).border = thinBorder;
    totalSales += Number(r.py_sales) || 0;
    jRow++;
  }

  // Baris Total — quirk: Sales POLOS tanpa numFmt
  ws.getCell(jRow, 2).value = "Total";
  ws.getCell(jRow, 3).value = totalSales;
  for (let c = 1; c <= lastCol; c++) {
    const cell = ws.getCell(jRow, c);
    cell.font = { bold: true };
    cell.border = thinBorder;
  }

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 12;
  ws.getColumn(3).width = 22;
};

// ── Export utama ──
const isExporting = ref(false);
const onExport = async () => {
  const rows =
    activeTab.value === "divisi"
      ? byDivisi.value
      : activeTab.value === "sales"
        ? bySales.value
        : activeTab.value === "performance"
          ? salesPerformance.value
          : proyeksi.value;

  if (!rows.length) return toast.warning("Tidak ada data untuk diexport.");
  isExporting.value = true;
  try {
    const info = await getPerushInfo();
    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Sheet1");

    if (activeTab.value === "divisi") buildDivisiSheet(ws, info);
    else if (activeTab.value === "sales") buildSalesSheet(ws, info);
    else if (activeTab.value === "performance") buildPerformanceSheet(ws, info);
    else buildProyeksiSheet(ws, info);

    const fileNameMap: Record<string, string> = {
      divisi: "Target_Achievement_By_Divisi",
      sales: "Target_Achievement_By_Sales",
      performance: "Sales_Performance",
      proyeksi: "Proyeksi_Sales",
    };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `${fileNameMap[activeTab.value]}_${filterState.value.tahun}.xlsx`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <div class="page-wrap">
    <div class="page-header">
      <h2 class="page-title">Monitoring Target vs Achievement</h2>
    </div>

    <div class="filter-bar">
      <div class="f-group">
        <span class="f-label">Periode bulan:</span>
        <select v-model.number="filterState.bulanAwal" class="f-select">
          <option v-for="b in BULAN_OPTIONS" :key="b.value" :value="b.value">
            {{ b.title }}
          </option>
        </select>
        <span class="f-sep">s.d</span>
        <select v-model.number="filterState.bulanAkhir" class="f-select">
          <option v-for="b in BULAN_OPTIONS" :key="b.value" :value="b.value">
            {{ b.title }}
          </option>
        </select>
      </div>
      <div class="f-group">
        <span class="f-label">Tahun:</span>
        <select v-model.number="filterState.tahun" class="f-select">
          <option v-for="y in YEAR_OPTIONS" :key="y" :value="y">{{ y }}</option>
        </select>
      </div>
      <v-btn
        size="small"
        color="primary"
        :loading="isLoading"
        @click="fetchData"
      >
        <template #prepend><IconRefresh :size="15" /></template>Refresh
      </v-btn>
      <v-spacer />
      <v-btn
        size="small"
        color="green"
        :loading="isExporting"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </div>

    <v-tabs v-model="activeTab" density="compact" class="page-tabs">
      <v-tab value="divisi">By Divisi</v-tab>
      <v-tab value="sales">By Sales</v-tab>
      <v-tab value="performance">Sales Performance</v-tab>
      <v-tab value="proyeksi">Proyeksi</v-tab>
    </v-tabs>

    <div class="tab-content">
      <TabByDivisi
        v-show="activeTab === 'divisi'"
        :items="byDivisi"
        :is-loading="isLoading"
      />
      <TabBySales
        v-show="activeTab === 'sales'"
        :items="bySales"
        :is-loading="isLoading"
      />
      <TabSalesPerformance
        v-show="activeTab === 'performance'"
        :items="salesPerformance"
        :is-loading="isLoading"
      />
      <TabProyeksi
        v-show="activeTab === 'proyeksi'"
        :items="proyeksi"
        :is-loading="isLoading"
        :tahun="filterState.tahun"
        @updated="reloadProyeksi"
      />
    </div>
  </div>
</template>

<style scoped>
.page-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 12px;
  gap: 10px;
}
.page-header {
  display: flex;
  align-items: center;
}
.page-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #dcedc8;
  border-radius: 6px;
  padding: 10px 14px;
  flex-wrap: wrap;
}
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 12px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-sep {
  font-size: 11px;
  color: #666;
}
.page-tabs {
  flex-shrink: 0;
}
.tab-content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
</style>
