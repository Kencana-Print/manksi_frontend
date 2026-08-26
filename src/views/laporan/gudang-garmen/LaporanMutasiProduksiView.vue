<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import type ExcelJS from "exceljs";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import PageLayout from "@/components/PageLayout.vue";
import BaseTable from "@/components/BaseTable.vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import PivotWithFilter from "@/components/PivotWithFilter.vue";
import { laporanMutasiProduksiService } from "@/services/laporan/gudang-garmen/laporanMutasiProduksiService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconRefresh,
  IconFileSpreadsheet,
  IconX,
  IconTable,
  IconChartBar,
  IconLayoutGrid,
  IconSearch,
  IconExternalLink,
} from "@tabler/icons-vue";

const MENU_ID = "524";
const authStore = useAuthStore();
const toast = useToast();
const router = useRouter();

// ── Filter ──
// Helper: format Date ke "YYYY-MM-DD" pakai komponen LOKAL
// (getFullYear/getMonth/getDate), BUKAN toISOString() yang convert
// ke UTC dulu dan bisa geser tanggal kalau timezone browser bukan UTC.
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
const cab = ref("ALL");
const nomorSpk = ref("");
const namaSpkTerpilih = ref(""); // nama produk hasil pilih SpkSearchModal (readonly display)
const namaSpk = ref(""); // teks pencarian bebas oleh user

const showSpkModal = ref(false);
const onSpkSelected = (item: any) => {
  nomorSpk.value = item.Nomor;
  namaSpkTerpilih.value = item.Nama || item.Nama2 || "";
  namaSpk.value = ""; // pilih SPK spesifik menggantikan pencarian nama bebas
  fetchData(); // ← auto-fetch begitu SPK dipilih
};
const onNomorSpkEnter = () => {
  // Ketik manual + Enter → pakai nomor apa adanya, kosongkan hint nama
  // (karena belum tentu valid/ketemu — biar backend yang validasi via query)
  namaSpkTerpilih.value = "";
  namaSpk.value = ""; // tetap eksklusif dengan pencarian nama bebas
  fetchData();
};
const clearSpk = () => {
  nomorSpk.value = "";
  namaSpkTerpilih.value = "";
  items.value = [];
  hasSearched.value = false;
};

// Sesuai perilaku Delphi: data hanya boleh dimuat kalau ada SPK spesifik
// dipilih ATAU nama SPK diketik — mencegah query tanpa filter yang berat
// (query ini narik dari 4 sumber sekaligus, LIKE '%%' bakal scan semua).
const canFetch = computed(() => !!startDate.value && !!endDate.value);

// ── Tab ──
const activeTab = ref<"grid" | "pivot" | "chart">("grid");

// ── Data ──
const items = ref<any[]>([]);
const isLoading = ref(false);
const hasSearched = ref(false);
const canExport = computed(() => authStore.can(MENU_ID, "view"));

// ── Fetch — HANYA dipanggil manual lewat tombol Tampilkan, tidak ada
// auto-fetch saat mount maupun saat filter berubah. ──
const fetchData = async () => {
  if (!canFetch.value) {
    toast.warning("Tentukan rentang tanggal terlebih dahulu.");
    return;
  }
  isLoading.value = true;
  items.value = [];
  hasSearched.value = true;
  try {
    const res = await laporanMutasiProduksiService.getBrowse({
      startDate: startDate.value,
      endDate: endDate.value,
      cab: cab.value,
      nomorSpk: nomorSpk.value.trim(),
      namaSpk: namaSpk.value.trim(),
    });
    items.value = res.data.data || [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data.");
  } finally {
    isLoading.value = false;
  }
};

// ── Headers ──
const headers = [
  { title: "No. SPK", key: "Nomor", width: "140px" },
  { title: "Nama SPK", key: "NamaSpk", width: "220px" },
  { title: "Tgl SPK", key: "TglSpk", width: "95px", align: "center" },
  { title: "Jumlah SPK", key: "JumlahSpk", width: "100px", align: "right" },
  { title: "Jenis Order", key: "JoKode", width: "110px" },
  { title: "Divisi", key: "DivisiNama", width: "100px" },
  { title: "Tipe", key: "Tipe", width: "80px" },
  { title: "No. Mutasi", key: "NomorMutasi", width: "120px" },
  { title: "No. Permintaan", key: "NoPermintaan", width: "120px" },
  { title: "Terpakai", key: "Terpakai", width: "90px", align: "right" },
  { title: "Babaran", key: "Babaran", width: "80px", align: "right" },
  { title: "Kelompok", key: "Kelompok", width: "110px" },
  { title: "Gudang Asal", key: "GudangAsal", width: "150px" },
  { title: "Gudang Tujuan", key: "GudangTujuan", width: "150px" },
  { title: "Tgl Mutasi", key: "TanggalMutasi", width: "95px", align: "center" },
  { title: "Kode", key: "Kode", width: "100px" },
  { title: "Komponen", key: "Komponen", minWidth: "150px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "BS Lini", key: "BsLini", width: "80px", align: "right" },
  { title: "BS Kain Sbl", key: "BsKainSablon", width: "90px", align: "right" },
  { title: "BS Kain", key: "BsKain", width: "80px", align: "right" },
  { title: "Satuan", key: "Satuan", width: "70px", align: "center" },
  { title: "Size", key: "Size", width: "60px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px" },
];

const totalJumlah = computed(() =>
  items.value.reduce((s, r) => s + Number(r.Jumlah || 0), 0),
);
const fmtNum = (n: any) =>
  new Intl.NumberFormat("id-ID").format(Math.round(Number(n) || 0));
const fmtDate = (v: string) => {
  if (!v) return "-";
  // Ambil 10 karakter pertama (YYYY-MM-DD) langsung dari string mentah,
  // TANPA lewat new Date() — mencegah pergeseran akibat konversi UTC→lokal.
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

// ── Bulan helper — dipakai sebagai kolom pivot/chart (Delphi punya Bulan/Tahun) ──
const itemsWithBulan = computed(() =>
  items.value.map((r) => {
    const d = r.TanggalMutasi ? new Date(r.TanggalMutasi) : null;
    return {
      ...r,
      Bulan:
        d && !isNaN(d.getTime())
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          : "-",
    };
  }),
);

// --- Flatten ----
const flattenedItems = computed(() => {
  const result: Record<string, any>[] = [];
  for (const r of itemsWithBulan.value) {
    const base = {
      Nomor: r.Nomor ?? "",
      NamaSpk: r.NamaSpk ?? "",
      TglSpk: r.TglSpk ?? "",
      JoKode: r.JoKode ?? "",
      DivisiNama: r.DivisiNama ?? "",
      Tipe: r.Tipe ?? "",
      NomorMutasi: r.NomorMutasi ?? "",
      NoPermintaan: r.NoPermintaan ?? "",
      Kelompok: r.Kelompok ?? "",
      GudangAsal: r.GudangAsal ?? "",
      GudangTujuan: r.GudangTujuan ?? "",
      TanggalMutasi: r.TanggalMutasi ?? "",
      Kode: r.Kode ?? "",
      Komponen: r.Komponen ?? "",
      Satuan: r.Satuan ?? "",
      Size: r.Size ?? "",
      Cab: r.Cab ?? "",
      Bulan: r.Bulan ?? "-",
    };
    const measures: [string, any][] = [
      ["Jumlah", r.Jumlah],
      ["Terpakai", r.Terpakai],
      ["Babaran", r.Babaran],
      ["BS Lini", r.BsLini],
      ["BS Kain Sablon", r.BsKainSablon],
      ["BS Kain", r.BsKain],
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
    `Mutasi_Produksi_Detail_${startDate.value}_${endDate.value}`,
    "Mutasi Produksi Detail",
    [
      { header: "No. SPK", key: "Nomor", width: 18 },
      { header: "Nama SPK", key: "NamaSpk", width: 26 },
      { header: "Tgl SPK", key: "TglSpk", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 10 },
      { header: "Tipe", key: "Tipe", width: 12 },
      { header: "No. Mutasi", key: "NomorMutasi", width: 16 },
      { header: "No. Permintaan", key: "NoPermintaan", width: 16 },
      {
        header: "Terpakai",
        key: "Terpakai",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Babaran",
        key: "Babaran",
        width: 10,
        align: "right",
        numFmt: "#,##0.0000",
      },
      { header: "Kelompok", key: "Kelompok", width: 14 },
      { header: "Gudang Asal", key: "GudangAsal", width: 20 },
      { header: "Gudang Tujuan", key: "GudangTujuan", width: 20 },
      {
        header: "Tgl Mutasi",
        key: "TanggalMutasi",
        width: 14,
        align: "center",
      },
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Komponen", key: "Komponen", width: 20 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Lini",
        key: "BsLini",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Kain Sbl",
        key: "BsKainSablon",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "BS Kain",
        key: "BsKain",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Satuan", key: "Satuan", width: 10 },
      { header: "Size", key: "Size", width: 10 },
      { header: "Cab", key: "Cab", width: 10 },
    ],
    items.value,
    `Laporan Mutasi Produksi Detail — ${startDate.value} s.d. ${endDate.value}`,
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
  a.download = `Pivot_Mutasi_Produksi_${startDate.value}_${endDate.value}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Export pivot berhasil.");
};

// ── Pivot — default sesuai konfigurasi Delphi:
const pivotWithFilterRef = ref<InstanceType<typeof PivotWithFilter> | null>(
  null,
);

// ── Chart reaktif — dibangun ulang OTOMATIS setiap kali user
// menyusun ulang pivot (rows/cols/values), lewat event pivot-changed
// yang di-emit TinyPivotOnly berdasarkan tabel HTML yang baru
// dirender. Tidak bergantung ke shape internal pivotResult. ──
const chartCanvasRef = ref<HTMLCanvasElement | null>(null);
const chartType = ref<"bar" | "line">("bar");
let chartInstance: any = null;
let lastPivotTable: any = null;

// ── Bangun label kolom multi-level dari header rows (occupancy-grid,
// pola sama seperti export) — tiap kolom bisa punya label gabungan
// dari beberapa baris header kalau ada rowSpan/colSpan. ──
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
  if (activeTab.value !== "chart") return; // canvas belum ada di DOM kalau tab lain aktif
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

// Kalau user pindah ke tab Chart SETELAH pivot sudah pernah disusun
// (canvas baru muncul di DOM saat itu), render ulang dari data terakhir
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

// ── Navigasi ke Ubah Mutasi Produksi — dibuka TAB BARU supaya
// laporan yang sedang difilter (gabungan 4 sumber, bisa lama) tidak
// hilang kalau user cuma mau intip 1 transaksi.
const openMutasi = (nomorMutasi: string) => {
  if (!nomorMutasi) return;
  const url = router.resolve({
    name: "MutasiProduksiEdit",
    params: { nomor: nomorMutasi },
  }).href;
  window.open(url, "_blank");
};

// ── Klik kiri baris → langsung buka (replikasi double-click Delphi
// paling umum), klik kanan → context menu "Lihat Transaksi" ──
const onRowClick = (item: any) => {
  openMutasi(item.NomorMutasi);
};

const showContextMenu = ref(false);
const contextMenuStyle = ref<Record<string, string>>({});
const contextMenuTarget = ref("");

const onRowContextMenu = (e: MouseEvent, item: any) => {
  if (!item.NomorMutasi) return; // baris tanpa mutasi (mis. sumber STBJ) tidak punya menu
  e.preventDefault();
  contextMenuTarget.value = item.NomorMutasi;
  contextMenuStyle.value = {
    position: "fixed",
    top: `${e.clientY}px`,
    left: `${e.clientX}px`,
    zIndex: "9999",
  };
  showContextMenu.value = true;
};

const closeContextMenu = () => {
  showContextMenu.value = false;
};

const onContextMenuAction = () => {
  openMutasi(contextMenuTarget.value);
  closeContextMenu();
};

// rowPropsFn — dikirim ke BaseTable, mengembalikan handler event yang
// akan diteruskan resolvedRowProps() ke elemen <tr> aslinya.
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (!item.NomorMutasi) return {};
  return {
    onContextmenu: (e: MouseEvent) => onRowContextMenu(e, item),
  };
};
</script>

<template>
  <PageLayout
    title="Laporan Mutasi Produksi Detail"
    :menu-id="MENU_ID"
    :icon="IconLayoutGrid"
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

    <div class="mp-wrap">
      <!-- ── Filter bar ── -->
      <div class="filter-bar">
        <span class="filter-lbl">Periode Mutasi:</span>
        <input type="date" v-model="startDate" class="date-inp" />
        <span class="filter-sep">s.d.</span>
        <input type="date" v-model="endDate" class="date-inp" />

        <span class="filter-lbl ml">Cabang:</span>
        <select v-model="cab" class="sel-inp">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>

        <span class="filter-lbl ml">No. SPK:</span>
        <div class="spk-picker">
          <input
            type="text"
            v-model="nomorSpk"
            class="text-inp"
            style="width: 130px"
            placeholder="Ketik / pilih..."
            @keydown.enter="onNomorSpkEnter"
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

        <span class="filter-lbl ml">Nama SPK:</span>
        <input
          type="text"
          v-model="namaSpk"
          class="text-inp"
          placeholder="Atau ketik nama..."
          style="width: 150px"
          :disabled="!!nomorSpk"
        />

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
            Total Jumlah: <b>{{ fmtNum(totalJumlah) }}</b>
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
        <div v-if="!hasSearched" class="search-guide">
          <IconSearch :size="40" :stroke-width="1.2" color="#bdbdbd" />
          <div class="sg-title">Tentukan periode, lalu klik Refresh</div>
          <div class="sg-sub">
            Laporan ini menggabungkan data dari 4 sumber transaksi sekaligus —
            tambahkan filter No./Nama SPK untuk mempersempit hasil dan
            mempercepat pemuatan, terutama untuk rentang tanggal yang panjang.
          </div>
        </div>
        <BaseTable
          v-else
          :headers="headers"
          :items="items"
          :is-loading="isLoading"
          item-value="NomorMutasi"
          :summary-columns="[
            'JumlahSpk',
            'Terpakai',
            'Babaran',
            'Jumlah',
            'BsLini',
            'BsKainSablon',
            'BsKain',
          ]"
          :row-props-fn="rowPropsFn"
          @row-click="onRowClick"
        >
          <template #item.NomorMutasi="{ item }">
            <span
              v-if="item.NomorMutasi"
              class="mutasi-link"
              @click="openMutasi(item.NomorMutasi)"
              @contextmenu="onRowContextMenu($event, item)"
            >
              {{ item.NomorMutasi }}
            </span>
            <span v-else class="muted">-</span>
          </template>
          <template #item.TglSpk="{ item }">{{
            fmtDate(item.TglSpk)
          }}</template>
          <template #item.JumlahSpk="{ item }">{{
            fmtNum(item.JumlahSpk)
          }}</template>
          <template #item.TanggalMutasi="{ item }">{{
            fmtDate(item.TanggalMutasi)
          }}</template>
          <template #item.Terpakai="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.Terpakai)
            }}</span>
          </template>
          <template #item.Babaran="{ item }">
            <span style="font-family: monospace">{{
              Number(item.Babaran || 0).toFixed(4)
            }}</span>
          </template>
          <template #item.Jumlah="{ item }">
            <span
              style="font-family: monospace; font-weight: 700; color: #1565c0"
            >
              {{ fmtNum(item.Jumlah) }}
            </span>
          </template>
          <template #item.BsLini="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.BsLini)
            }}</span>
          </template>
          <template #item.BsKainSablon="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.BsKainSablon)
            }}</span>
          </template>
          <template #item.BsKain="{ item }">
            <span style="font-family: monospace">{{
              fmtNum(item.BsKain)
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
              Field "Jenis" berisi Jumlah/Terpakai/Babaran/BS Lini/BS Kain
              Sablon/BS Kain — susun sebagai baris/kolom untuk bandingkan antar
              ukuran.
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
            :data="itemsWithBulan"
            :filterable-columns="[
              'DivisiNama',
              'Kelompok',
              'GudangAsal',
              'GudangTujuan',
              'Cab',
              'Bulan',
              'Komponen',
              'NamaSpk',
              'NomorMutasi',
              'TanggalMutasi',
              'NoPermintaan',
              'BsKain',
            ]"
            :default-rows="['Kelompok', 'Size', 'NamaSpk', 'Komponen']"
            :default-cols="['GudangAsal']"
            :default-vals="[{ field: 'Jumlah', agg: 'sum' }]"
            @pivot-changed="onPivotChanged"
          />
        </template>
      </div>

      <!-- ── Grafik  ── -->
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
      filter-mode="spk-ppic"
      @selected="onSpkSelected"
    />

    <Teleport to="body">
      <div
        v-if="showContextMenu"
        class="mp-context-backdrop"
        @click="closeContextMenu"
        @contextmenu.prevent="closeContextMenu"
      >
        <div class="mp-context-menu" :style="contextMenuStyle" @click.stop>
          <button class="mp-context-item" @click="onContextMenuAction">
            <IconExternalLink :size="14" />
            Lihat Transaksi
          </button>
        </div>
      </div>
    </Teleport>
  </PageLayout>
</template>

<style scoped>
.mp-wrap {
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
.mutasi-link {
  color: #1565c0;
  font-family: monospace;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
}
.mutasi-link:hover {
  text-decoration: underline;
}
.muted {
  color: #9e9e9e;
}
.mp-context-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9998;
}
.mp-context-menu {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  min-width: 160px;
  padding: 4px;
}
.mp-context-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: none;
  font-size: 12px;
  color: #1565c0;
  cursor: pointer;
  border-radius: 4px;
  text-align: left;
}
.mp-context-item:hover {
  background: #e3f2fd;
}
</style>
