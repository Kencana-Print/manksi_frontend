<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "@/services/api";
import {
  proyeksiBulananService,
  type ProyeksiColumn,
} from "@/services/laporan/marketing/proyeksiBulananService";
import { formatTanggal } from "@/utils/dateFormat";
import { IconChartLine, IconFileSpreadsheet } from "@tabler/icons-vue";

const MENU_ID = "1294";
const toast = useToast();

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const filterState = ref({
  dtAwal: toLocalDateStr(firstDayOfMonth),
  dtAkhir: toLocalDateStr(today),
  laporan: "1",
});

const LAPORAN_OPTIONS = [
  { value: "1", title: "1. Proyeksi" },
  { value: "2", title: "2. Penawaran" },
  { value: "3", title: "3. Memo SPK" },
  { value: "4", title: "4. SPK" },
];

// ── Kolom & judul dinamis dari backend (beda tiap mode laporan) ──
const columnsMeta = ref<ProyeksiColumn[]>([]);
const reportTitle = ref("");

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: MENU_ID,
  fetchApi: async () => {
    const res = await proyeksiBulananService.getBrowse(
      filterState.value.dtAwal,
      filterState.value.dtAkhir,
      filterState.value.laporan,
    );
    const data = res.data.data;
    columnsMeta.value = data.columns || [];
    reportTitle.value = data.reportTitle || "";
    return data.rows || [];
  },
});

watch(
  () => [
    filterState.value.dtAwal,
    filterState.value.dtAkhir,
    filterState.value.laporan,
  ],
  fetchData,
);

// ── Header grid dinamis dari metadata kolom ──
const headers = computed(() =>
  columnsMeta.value.map((c) => ({
    title: c.title,
    key: c.key,
    align: c.numeric ? "end" : undefined,
    minWidth: c.numeric ? "110px" : "140px",
  })),
);

const numFmt = (v: any) => {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 });
};

// ── Baris data mentah + baris TOTAL sintetis di akhir (mengikuti
// footer skSum kolom-kolom bertanda sum:true di source Delphi) ──
const dataRows = computed(() => items.value ?? []);

const totalsRow = computed(() => {
  if (!columnsMeta.value.length || !dataRows.value.length) return null;
  const row: Record<string, any> = { __isTotal: true };
  let labelSet = false;
  for (const col of columnsMeta.value) {
    if (col.sum) {
      row[col.key] = dataRows.value.reduce(
        (acc, r) => acc + (Number(r[col.key]) || 0),
        0,
      );
    } else if (!labelSet) {
      row[col.key] = "TOTAL:";
      labelSet = true;
    } else {
      row[col.key] = "";
    }
  }
  return row;
});

const rowsWithTotal = computed(() => {
  if (!totalsRow.value) return dataRows.value;
  return [...dataRows.value, totalsRow.value];
});

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item?.__isTotal) {
    return { class: "font-weight-bold bg-blue-lighten-5" };
  }
  return {};
};

// ── Export ──
// ── Export — replikasi layout letterhead Excel Delphi (kop
// perusahaan, tabel NAMA LAPORAN/PERIODE, header data biru, total,
// blok ttd). Kolom dinamis mengikuti mode laporan yang dipilih. ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  if (!dataRows.value.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    // ⚠️ Laporan ini gak punya filter "perusahaan mana" — ambil entry
    // pertama dari /lookups/perusahaan sebagai letterhead default,
    // sama seperti pola Proyeksi vs Realisasi.
    let namaPerush = "";
    let alamatPerush = "";
    try {
      const perushRes = await api.get("/lookups/perusahaan");
      const list = perushRes.data.data || [];
      if (list.length) {
        namaPerush = list[0].perush_nama || "";
        alamatPerush = list[0].perush_alamat || "";
      }
    } catch {
      // letterhead gagal dimuat — tetap lanjut export tanpa kop
    }

    const cols = columnsMeta.value;
    const lastCol = cols.length;

    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Sheet1");

    // ── Kop perusahaan ──
    ws.mergeCells(1, 1, 1, lastCol);
    ws.getCell(1, 1).value = `${namaPerush}\n${alamatPerush}`;
    ws.getCell(1, 1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getRow(1).height = 40;

    // ── Blok NAMA LAPORAN / PERIODE ──
    ws.mergeCells(2, 1, 2, 2);
    ws.getCell(2, 1).value = "NAMA LAPORAN\n \nPERIODE";
    ws.getCell(2, 1).alignment = { wrapText: true, vertical: "top" };
    ws.mergeCells(2, 3, 2, lastCol);
    ws.getCell(2, 3).value =
      `: ${reportTitle.value}\n:\n: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`;
    ws.getCell(2, 3).alignment = {
      wrapText: true,
      vertical: "top",
      horizontal: "left",
    };
    ws.getRow(2).height = 45;

    // ── Header kolom data (dinamis, dari columnsMeta) ──
    cols.forEach((c, i) => {
      ws.getCell(3, i + 1).value = c.title;
    });
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(3, c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF87CEEB" },
      };
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center", vertical: "middle" };
    }

    // ── Data rows ──
    let jRow = 4;
    for (const r of dataRows.value) {
      cols.forEach((c, i) => {
        const v = r[c.key];
        ws.getCell(jRow, i + 1).value = c.numeric ? Number(v) || 0 : (v ?? "");
      });
      jRow++;
    }

    // ── Total row — cuma kolom bertanda sum:true yang ditotal,
    // label "TOTAL:" ditaruh di kolom non-numerik pertama ──
    let labelSet = false;
    cols.forEach((c, i) => {
      const cell = ws.getCell(jRow, i + 1);
      if (c.sum) {
        cell.value = dataRows.value.reduce(
          (acc, r) => acc + (Number(r[c.key]) || 0),
          0,
        );
      } else if (!labelSet) {
        cell.value = "TOTAL:";
        labelSet = true;
      }
    });
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(jRow, c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF87CEEB" },
      };
      cell.font = { bold: true };
    }
    const totalRow = jRow;
    jRow++;

    // ── Border seluruh area tabel ──
    for (let r = 3; r <= totalRow; r++) {
      for (let c = 1; c <= lastCol; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    // ── Format angka & lebar kolom, dinamis per metadata ──
    cols.forEach((c, i) => {
      const col = ws.getColumn(i + 1);
      if (c.numeric) col.numFmt = "#,##0.00";
      col.width = c.numeric ? 14 : c.key === "Customer" ? 30 : 20;
    });

    // ── Blok tanda tangan ──
    jRow += 2;
    const half = Math.max(1, Math.floor(lastCol / 2));
    ws.mergeCells(jRow, 1, jRow, half);
    ws.getCell(jRow, 1).value = "TERTANDA,";
    ws.mergeCells(jRow, half + 1, jRow, lastCol);
    ws.getCell(jRow, half + 1).value = "MENGETAHUI,";
    jRow += 4;
    ws.mergeCells(jRow, 1, jRow, half);
    ws.getCell(jRow, 1).value = "( ........................ )";
    ws.getCell(jRow, 1).alignment = { horizontal: "center" };
    ws.mergeCells(jRow, half + 1, jRow, lastCol);
    ws.getCell(jRow, half + 1).value = "( ........................ )";
    ws.getCell(jRow, half + 1).alignment = { horizontal: "center" };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Laporan_${reportTitle.value.replace(/\s+/g, "_")}_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    :title="`Laporan ${reportTitle || 'Proyeksi Bulanan'}`"
    :menu-id="MENU_ID"
    :icon="IconChartLine"
    :headers="headers"
    :items="rowsWithTotal"
    :is-loading="isLoading"
    :can-export="false"
    :row-props-fn="rowPropsFn"
    search-placeholder="Cari customer / nama..."
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Laporan</span>
        <select v-model="filterState.laporan" class="f-select">
          <option
            v-for="opt in LAPORAN_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.title }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="green"
        :loading="isExporting"
        :disabled="!dataRows.length"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>

    <!-- Format angka untuk semua kolom numerik secara dinamis -->
    <template
      v-for="col in columnsMeta.filter((c) => c.numeric)"
      :key="col.key"
      #[`item.${col.key}`]="{ item }"
    >
      <span :class="{ 'font-weight-bold': item.__isTotal }">
        {{
          item.__isTotal && item[col.key] === "" ? "" : numFmt(item[col.key])
        }}
      </span>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-date,
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
  color: #777;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
</style>
