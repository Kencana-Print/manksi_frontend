<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import api from "@/services/api";
import { proyeksiVsRealisasiService } from "@/services/laporan/marketing/proyeksiVsRealisasiService";
import { formatTanggal } from "@/utils/dateFormat";
import { IconTrendingUp, IconFileSpreadsheet } from "@tabler/icons-vue";

const MENU_ID = "1244";
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
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: MENU_ID,
  fetchApi: async () => {
    const res = await proyeksiVsRealisasiService.getBrowse(
      filterState.value.dtAwal,
      filterState.value.dtAkhir,
    );
    return res.data.data || [];
  },
});

watch(
  [() => filterState.value.dtAwal, () => filterState.value.dtAkhir],
  fetchData,
);

const headers = [
  { title: "Cus Kode", key: "CusKode", width: "90px" },
  { title: "Cus Nama", key: "CusNama", minWidth: "260px" },
  { title: "JO Kode", key: "JoKode", width: "80px" },
  { title: "JO Nama", key: "JoNama", minWidth: "160px" },
  { title: "Total Memo", key: "TotalMemo", width: "140px", align: "end" },
  {
    title: "Realisasi Memo",
    key: "RealisasiMemo",
    width: "140px",
    align: "end",
  },
  { title: "Realisasi All", key: "RealisasiAll", width: "140px", align: "end" },
];

const rows = computed(() => items.value ?? []);

const numFmt = (v: any) =>
  v || v === 0
    ? Number(v).toLocaleString("id-ID", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "";

const sumBy = (list: any[], key: string) =>
  list.reduce((s, r) => s + (Number(r[key]) || 0), 0);

// ── Export — replikasi layout letterhead Excel Delphi (kop perusahaan,
// tabel NAMA LAPORAN/PERIODE, header data biru, total, blok ttd). ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const dataRows =
    baseBrowseRef.value?.getFilteredItems?.() ?? rows.value ?? [];
  if (!dataRows.length)
    return toast.warning("Tidak ada data untuk diekspor (cek filter aktif).");
  isExporting.value = true;
  try {
    // Hitung total DARI dataRows yang sudah difilter, bukan computed lama
    const totalMemoVal = sumBy(dataRows, "TotalMemo");
    const totalRealisasiMemoVal = sumBy(dataRows, "RealisasiMemo");
    const totalRealisasiAllVal = sumBy(dataRows, "RealisasiAll");

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

    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Sheet1");

    const lastCol = 7; // A..G

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
      `: Proyeksi vs Realisasi\n:\n: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`;
    ws.getCell(2, 3).alignment = {
      wrapText: true,
      vertical: "top",
      horizontal: "left",
    };
    ws.getRow(2).height = 45;

    // ── Header kolom data ──
    const dataHeaders = [
      "CUS_KODE",
      "CUS_NAMA",
      "JO_KODE",
      "JO_NAMA",
      "TOTAL_MEMO",
      "REALISASI_MEMO",
      "REALISASI_ALL",
    ];
    dataHeaders.forEach((h, i) => (ws.getCell(3, i + 1).value = h));
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
    for (const r of dataRows) {
      ws.getCell(jRow, 1).value = r.CusKode ?? "";
      ws.getCell(jRow, 2).value = r.CusNama ?? "";
      ws.getCell(jRow, 3).value = r.JoKode ?? "";
      ws.getCell(jRow, 4).value = r.JoNama ?? "";
      ws.getCell(jRow, 5).value = r.TotalMemo ?? "";
      ws.getCell(jRow, 6).value = r.RealisasiMemo ?? "";
      ws.getCell(jRow, 7).value = r.RealisasiAll ?? "";
      jRow++;
    }
    const lastDataRow = jRow - 1;
    // ── Total row ──
    ws.getCell(jRow, 1).value = "TOTAL:";
    ws.getCell(jRow, 1).font = { bold: true };
    ws.getCell(jRow, 5).value = totalMemoVal;
    ws.getCell(jRow, 6).value = totalRealisasiMemoVal;
    ws.getCell(jRow, 7).value = totalRealisasiAllVal;
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

    ws.getColumn(5).numFmt = "#,##0.00";
    ws.getColumn(6).numFmt = "#,##0.00";
    ws.getColumn(7).numFmt = "#,##0.00";

    ws.getColumn(1).width = 12;
    ws.getColumn(2).width = 38;
    ws.getColumn(3).width = 10;
    ws.getColumn(4).width = 20;
    ws.getColumn(5).width = 16;
    ws.getColumn(6).width = 16;
    ws.getColumn(7).width = 16;

    // ── Blok tanda tangan ──
    jRow += 2;
    ws.mergeCells(jRow, 1, jRow, 3);
    ws.getCell(jRow, 1).value = "TERTANDA,";
    ws.mergeCells(jRow, 5, jRow, lastCol);
    ws.getCell(jRow, 5).value = "MENGETAHUI,";
    jRow += 4;
    ws.mergeCells(jRow, 1, jRow, 3);
    ws.getCell(jRow, 1).value = "( ........................ )";
    ws.getCell(jRow, 1).alignment = { horizontal: "center" };
    ws.mergeCells(jRow, 5, jRow, lastCol);
    ws.getCell(jRow, 5).value = "( ........................ )";
    ws.getCell(jRow, 5).alignment = { horizontal: "center" };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Proyeksi_vs_Realisasi_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
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
    ref="baseBrowseRef"
    title="Laporan Proyeksi vs Realisasi"
    :menu-id="MENU_ID"
    :icon="IconTrendingUp"
    :headers="headers"
    :items="rows"
    :is-loading="isLoading"
    :can-export="false"
    item-value="CusKode"
    search-placeholder="Cari kode / nama customer..."
    :summary-columns="['TotalMemo', 'RealisasiMemo', 'RealisasiAll']"
    :summary-formatters="{
      TotalMemo: (items) => numFmt(sumBy(items, 'TotalMemo')),
      RealisasiMemo: (items) => numFmt(sumBy(items, 'RealisasiMemo')),
      RealisasiAll: (items) => numFmt(sumBy(items, 'RealisasiAll')),
    }"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s.d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
    </template>
    <template #extra-actions>
      <v-btn
        size="small"
        color="green"
        :loading="isExporting"
        :disabled="!rows.length"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>
    <template #item.TotalMemo="{ item }">{{ numFmt(item.TotalMemo) }}</template>
    <template #item.RealisasiMemo="{ item }">{{
      numFmt(item.RealisasiMemo)
    }}</template>
    <template #item.RealisasiAll="{ item }">{{
      numFmt(item.RealisasiAll)
    }}</template>
    <!-- summary-row dihapus — sekarang pakai summary-columns bawaan BaseBrowse -->
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
.f-date {
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
.ms-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 12px;
  height: 30px;
  min-width: max-content;
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
.ms-sep {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}
</style>
