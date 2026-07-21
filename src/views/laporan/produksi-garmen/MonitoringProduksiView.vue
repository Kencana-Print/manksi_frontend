<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import { monitoringProduksiService } from "@/services/laporan/produksi-garmen/monitoringProduksiService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconGauge, IconFileSpreadsheet } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "554";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));
const dtAkhir = ref(toLocalDateStr(today));

const userCab = authStore.user?.cabang || "";
const cab = ref(userCab && ["P01", "P04"].includes(userCab) ? userCab : "P04");

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await monitoringProduksiService.getBrowse(
      dtAwal.value,
      dtAkhir.value,
      cab.value,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([dtAwal, dtAkhir, cab], fetchData);

const headers = [
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Potong", key: "Potong", width: "90px", align: "center" },
  { title: "QC Potong", key: "QcPotong", width: "90px", align: "center" },
  { title: "Cetak", key: "Cetak", width: "90px", align: "center" },
  { title: "Pres DTF", key: "PresDtf", width: "90px", align: "center" },
  { title: "QC Cetak", key: "QcCetak", width: "90px", align: "center" },
  { title: "DC", key: "Dc", width: "90px", align: "center" },
  { title: "Jahit", key: "Jahit", width: "90px", align: "center" },
  { title: "Lipat", key: "Lipat", width: "90px", align: "center" },
];

const numFmt = (v: any) => Number(v || 0).toLocaleString("id-ID");
const formatTgl = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}-${m}-${y}`;
};

const totals = computed(() => {
  const cols = [
    "Potong",
    "QcPotong",
    "Cetak",
    "PresDtf",
    "QcCetak",
    "Dc",
    "Jahit",
    "Lipat",
  ];
  const list = items.value ?? [];
  const t: Record<string, number> = {};
  for (const c of cols) {
    t[c] = list.reduce((s, r) => s + Number(r[c] || 0), 0);
  }
  return t;
});

// ── Export flat (sederhana) ──
const isExportingSimple = ref(false);
const onExportSimple = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const list = items.value ?? [];
  if (!list.length) return toast.warning("Tidak ada data.");
  isExportingSimple.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      {
        header: "Potong",
        key: "Potong",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "QC Potong",
        key: "QcPotong",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Cetak",
        key: "Cetak",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Pres DTF",
        key: "PresDtf",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "QC Cetak",
        key: "QcCetak",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "DC", key: "Dc", width: 12, align: "right", numFmt: "#,##0" },
      {
        header: "Jahit",
        key: "Jahit",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Lipat",
        key: "Lipat",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];
    await exportExcelSingle(
      `Monitoring_Produksi_${dtAwal.value}_${dtAkhir.value}.xlsx`,
      "Monitoring Produksi",
      columns,
      list,
      `Laporan Monitoring Produksi — Divisi Garmen ${cab.value}`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExportingSimple.value = false;
  }
};

// ── Export format lama (replikasi persis layout Delphi: header
// 2 baris merge TANGGAL/LINI, background biru langit, border tebal) ──
const isExportingFormatted = ref(false);
const onExportFormatted = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const list = items.value ?? [];
  if (!list.length) return toast.warning("Tidak ada data.");
  isExportingFormatted.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Monitoring Produksi");

    ws.getCell(1, 1).value = "LAPORAN MONITORING PRODUKSI";
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(2, 1).value = `DIVISI GARMEN ${cab.value}`;
    ws.getCell(2, 1).font = { bold: true };
    ws.getCell(3, 1).value =
      `TANGGAL : ${formatTgl(dtAwal.value)} s.d ${formatTgl(dtAkhir.value)}`;
    ws.getCell(3, 1).font = { bold: true };

    // Header 2 baris: A4:A5 merge "TANGGAL", B4:I4 merge "LINI", baris 5 sub-header
    ws.mergeCells(4, 1, 5, 1);
    ws.getCell(4, 1).value = "TANGGAL";
    ws.mergeCells(4, 2, 4, 9);
    ws.getCell(4, 2).value = "LINI";

    const subHeaders = [
      "POTONG",
      "QC POTONG",
      "CETAK",
      "PRES DTF",
      "QC CETAK",
      "DC",
      "JAHIT",
      "LIPAT",
    ];
    subHeaders.forEach((h, i) => {
      ws.getCell(5, i + 2).value = h;
    });

    const skyBlue = "FF87CEEB";
    for (let r = 4; r <= 5; r++) {
      for (let c = 1; c <= 9; c++) {
        const cell = ws.getCell(r, c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: skyBlue },
        };
        cell.font = { bold: true };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
      }
    }
    ws.getRow(1).font = { bold: true };
    ws.getRow(2).font = { bold: true };
    ws.getRow(3).font = { bold: true };

    let jRow = 6;
    for (const r of list) {
      ws.getCell(jRow, 1).value = formatTgl(r.Tanggal);
      ws.getCell(jRow, 2).value = Number(r.Potong || 0);
      ws.getCell(jRow, 3).value = Number(r.QcPotong || 0);
      ws.getCell(jRow, 4).value = Number(r.Cetak || 0);
      ws.getCell(jRow, 5).value = Number(r.PresDtf || 0);
      ws.getCell(jRow, 6).value = Number(r.QcCetak || 0);
      ws.getCell(jRow, 7).value = Number(r.Dc || 0);
      ws.getCell(jRow, 8).value = Number(r.Jahit || 0);
      ws.getCell(jRow, 9).value = Number(r.Lipat || 0);
      jRow++;
    }
    const lastRow = jRow - 1;

    // Border tebal di seluruh area tabel (A4:I lastRow)
    for (let r = 4; r <= lastRow; r++) {
      for (let c = 1; c <= 9; c++) {
        ws.getCell(r, c).border = {
          top: { style: "medium" },
          left: { style: "medium" },
          bottom: { style: "medium" },
          right: { style: "medium" },
        };
      }
    }
    // Number format ribuan untuk kolom B..I data
    for (let r = 6; r <= lastRow; r++) {
      for (let c = 2; c <= 9; c++) {
        ws.getCell(r, c).numFmt = "#,##0";
      }
    }

    ws.getColumn(1).width = 13;
    for (let c = 2; c <= 9; c++) ws.getColumn(c).width = 12;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Monitoring_Produksi_Formatted_${dtAwal.value}_${dtAkhir.value}.xlsx`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExportingFormatted.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Laporan Monitoring Produksi"
    :menu-id="menuId"
    :icon="IconGauge"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Tanggal"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode Transaksi</span>
        <input type="date" v-model="dtAwal" class="f-date" />
        <span class="f-sep">sd</span>
        <input type="date" v-model="dtAkhir" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Cabang</span>
        <select v-model="cab" class="f-select">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="primary"
        class="mr-1"
        :loading="isExportingSimple"
        @click="onExportSimple"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="success"
        :loading="isExportingFormatted"
        @click="onExportFormatted"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        (Format Lama)
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.Potong="{ item }">{{ numFmt(item.Potong) }}</template>
    <template #item.QcPotong="{ item }">{{ numFmt(item.QcPotong) }}</template>
    <template #item.Cetak="{ item }">{{ numFmt(item.Cetak) }}</template>
    <template #item.PresDtf="{ item }">{{ numFmt(item.PresDtf) }}</template>
    <template #item.QcCetak="{ item }">{{ numFmt(item.QcCetak) }}</template>
    <template #item.Dc="{ item }">{{ numFmt(item.Dc) }}</template>
    <template #item.Jahit="{ item }">{{ numFmt(item.Jahit) }}</template>
    <template #item.Lipat="{ item }">{{ numFmt(item.Lipat) }}</template>

    <template #summary-row="{ filteredItems }">
      <span class="summary-lbl">Total:</span>
      <span class="summary-val">
        Potong
        {{
          numFmt(filteredItems.reduce((s, r) => s + Number(r.Potong || 0), 0))
        }}
      </span>
      <span class="summary-val">
        QC Potong
        {{
          numFmt(filteredItems.reduce((s, r) => s + Number(r.QcPotong || 0), 0))
        }}
      </span>
      <span class="summary-val">
        Cetak
        {{
          numFmt(filteredItems.reduce((s, r) => s + Number(r.Cetak || 0), 0))
        }}
      </span>
      <span class="summary-val">
        Pres DTF
        {{
          numFmt(filteredItems.reduce((s, r) => s + Number(r.PresDtf || 0), 0))
        }}
      </span>
      <span class="summary-val">
        QC Cetak
        {{
          numFmt(filteredItems.reduce((s, r) => s + Number(r.QcCetak || 0), 0))
        }}
      </span>
      <span class="summary-val">
        DC
        {{ numFmt(filteredItems.reduce((s, r) => s + Number(r.Dc || 0), 0)) }}
      </span>
      <span class="summary-val">
        Jahit
        {{
          numFmt(filteredItems.reduce((s, r) => s + Number(r.Jahit || 0), 0))
        }}
      </span>
      <span class="summary-val">
        Lipat
        {{
          numFmt(filteredItems.reduce((s, r) => s + Number(r.Lipat || 0), 0))
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
  outline: none;
  background: white;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}
.totals-row td {
  background: #f5f5f5;
  border-top: 2px solid #bbb;
  padding: 6px 10px;
  font-size: 12px;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}
.fw {
  font-weight: 700;
}
.summary-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.summary-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-family: monospace;
}
</style>
