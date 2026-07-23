<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useAuthStore } from "@/stores/authStore";
import { monitoringKekuranganProduksiService } from "@/services/laporan/produksi-garmen/monitoringKekuranganProduksiService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconAlertTriangle, IconFileSpreadsheet } from "@tabler/icons-vue";

const toast = useToast();
const authStore = useAuthStore();
const menuId = "555";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));

const userCab = authStore.user?.cabang || "";
const cab = ref(userCab && ["P01", "P04"].includes(userCab) ? userCab : "P04");

const cpo = computed(() => {
  if (cab.value === "P01") return "P04";
  if (cab.value === "P04") return "P01";
  return "";
});

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await monitoringKekuranganProduksiService.getBrowse(
      dtAwal.value,
      cab.value,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([dtAwal, cab], fetchData);

const headers = [
  { title: "SPK", key: "Spk", width: "120px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Nama", key: "Nama", minWidth: "260px" },
  { title: "Finishing", key: "Finishing", minWidth: "220px" },
  { title: "Jml SPK", key: "JmlSpk", width: "90px", align: "center" },
  { title: "Potong", key: "Potong", width: "90px", align: "center" },
  { title: "Cetak", key: "Cetak", width: "90px", align: "center" },
  { title: "HotPres", key: "HotPres", width: "90px", align: "center" },
  { title: "QcCetak", key: "QcCetak", width: "90px", align: "center" },
  { title: "DC", key: "DC", width: "90px", align: "center" },
  { title: "Jahit", key: "Jahit", width: "90px", align: "center" },
  { title: "Lipat", key: "Lipat", width: "90px", align: "center" },
  {
    title: "Kedatangan Bahan Cuting",
    key: "KedatanganBahanCuting",
    width: "160px",
    align: "center",
  },
];

const numFmt = (v: any, d = 0) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const formatTgl = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};
const formatTglLong = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  if (!y || !m || !d) return v;
  return `${d}-${months[Number(m) - 1]}-${y}`;
};

// ── Export biasa ──
const isExportingSimple = ref(false);
const onExportSimple = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const list = items.value ?? [];
  if (!list.length) return toast.warning("Tidak ada data.");
  isExportingSimple.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "SPK", key: "Spk", width: 16 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Cab", key: "Cab", width: 8 },
      { header: "Divisi", key: "Divisi", width: 10 },
      { header: "Nama", key: "Nama", width: 32 },
      { header: "Finishing", key: "Finishing", width: 28 },
      {
        header: "Jml SPK",
        key: "JmlSpk",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Potong",
        key: "Potong",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Cetak",
        key: "Cetak",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "HotPres",
        key: "HotPres",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "QcCetak",
        key: "QcCetak",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "DC", key: "DC", width: 10, align: "right", numFmt: "#,##0" },
      {
        header: "Jahit",
        key: "Jahit",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Lipat",
        key: "Lipat",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kedatangan Bahan Cuting",
        key: "KedatanganBahanCuting",
        width: 16,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcelSingle(
      `Monitoring_Kekurangan_Produksi_${dtAwal.value}.xlsx`,
      "Monitoring Kekurangan Produksi",
      columns,
      list,
      `Laporan Monitoring Kekurangan Produksi — Divisi Garmen ${cab.value}`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExportingSimple.value = false;
  }
};

// ── Export to Excel — replikasi format lama Delphi ──
const isExportingFormatted = ref(false);
const onExportFormatted = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const list = items.value ?? [];
  if (!list.length) return toast.warning("Tidak ada data.");
  isExportingFormatted.value = true;
  try {
    const standarRes =
      await monitoringKekuranganProduksiService.getStandarOutput();
    const std = standarRes.data.data;

    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Monitoring Kekurangan Produksi");

    ws.getCell(1, 1).value = "LAPORAN MONITORING KEKURANGAN PRODUKSI";
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(2, 1).value = `DIVISI GARMEN ${cab.value}`;
    ws.getCell(2, 1).font = { bold: true };
    ws.getCell(3, 1).value =
      `TANGGAL : ${formatTgl(dtAwal.value)} s.d${formatTgl(toLocalDateStr(new Date()))}`;
    ws.getCell(3, 1).font = { bold: true };

    const headerRow4 = [
      "NO",
      "SPK",
      "TGL SPK",
      "DATELINE",
      "CAB",
      "DIVISI",
      "NAMA",
      "FINISHING",
      "ORDER",
      `PO POTONG ${cpo.value}`,
      "KURANG POTONG",
      `PO CETAK ${cpo.value}`,
      "KURANG CETAK",
      `PO HOTPRES ${cpo.value}`,
      "KURANG HOTPRES",
      `PO QCCETAK ${cpo.value}`,
      "KURANG QC CETAK",
      "DC",
      `PO JAHIT ${cpo.value}`,
      "KURANG JAHIT",
      `PO LIPAT ${cpo.value}`,
      "KURANG LIPAT ",
      "KEDATANGAN BAHAN CUTING",
    ];
    headerRow4.forEach((h, i) => (ws.getCell(4, i + 1).value = h));

    const skyBlue = "FF87CEEB";
    for (let c = 1; c <= 23; c++) {
      const cell = ws.getCell(4, c);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: skyBlue },
      };
      cell.font = { bold: true };
      cell.alignment = { vertical: "middle", wrapText: true };
    }
    ws.getRow(1).font = { bold: true };
    ws.getRow(2).font = { bold: true };
    ws.getRow(3).font = { bold: true };

    let jRow = 5;
    let n = 1;
    for (const r of list) {
      ws.getCell(jRow, 1).value = n;
      ws.getCell(jRow, 2).value = r.Spk;
      ws.getCell(jRow, 3).value = formatTglLong(r.Tanggal);
      ws.getCell(jRow, 4).value = formatTglLong(r.Dateline);
      ws.getCell(jRow, 5).value = r.Cab;
      ws.getCell(jRow, 6).value = r.Divisi;
      ws.getCell(jRow, 7).value = r.Nama;
      ws.getCell(jRow, 8).value = r.Finishing;
      ws.getCell(jRow, 9).value = Number(r.JmlSpk || 0);
      ws.getCell(jRow, 10).value = Number(r.IPotong || 0);
      ws.getCell(jRow, 11).value = Number(r.Potong || 0);
      ws.getCell(jRow, 12).value = Number(r.ICetak || 0);
      ws.getCell(jRow, 13).value = Number(r.Cetak || 0);
      ws.getCell(jRow, 14).value = Number(r.IHot || 0);
      ws.getCell(jRow, 15).value = Number(r.HotPres || 0);
      ws.getCell(jRow, 16).value = Number(r.IQcCetak || 0);
      ws.getCell(jRow, 17).value = Number(r.QcCetak || 0);
      ws.getCell(jRow, 18).value = Number(r.DC || 0);
      ws.getCell(jRow, 19).value = Number(r.IJahit || 0);
      ws.getCell(jRow, 20).value = Number(r.Jahit || 0);
      ws.getCell(jRow, 21).value = Number(r.ILipat || 0);
      ws.getCell(jRow, 22).value = Number(r.Lipat || 0);
      ws.getCell(jRow, 23).value = Number(r.KedatanganBahanCuting || 0);
      jRow++;
      n++;
    }
    const lastDataRow = jRow - 1;

    // Baris "KEKURANGAN" (SUM)
    ws.mergeCells(jRow, 1, jRow, 8);
    ws.getCell(jRow, 1).value = "KEKURANGAN";
    const sumCols = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];
    for (const c of sumCols) {
      const colLetter = ws.getColumn(c).letter;
      ws.getCell(jRow, c).value = {
        formula: `SUM(${colLetter}4:${colLetter}${lastDataRow})`,
      };
    }
    for (let c = 1; c <= 23; c++) {
      ws.getCell(jRow, c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };
    }
    const kekuranganRow = jRow;
    jRow++;

    // Baris "STANDAR OUTPUT PER HARI"
    ws.mergeCells(jRow, 1, jRow, 8);
    ws.getCell(jRow, 1).value = "STANDAR OUTPUT PER HARI";
    ws.getCell(jRow, 11).value = std.potong;
    ws.getCell(jRow, 13).value = std.cetak;
    ws.getCell(jRow, 15).value = std.hotpres;
    ws.getCell(jRow, 17).value = std.qccetak;
    ws.getCell(jRow, 18).value = std.dc;
    ws.getCell(jRow, 20).value = std.jahit;
    ws.getCell(jRow, 22).value = std.lipat;
    for (let c = 1; c <= 23; c++) {
      ws.getCell(jRow, c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };
    }
    const standarRow = jRow;
    jRow++;

    // Baris "WAITING LIST KERJA (HARI)"
    ws.mergeCells(jRow, 1, jRow, 8);
    ws.getCell(jRow, 1).value = "WAITING LIST KERJA (HARI)";
    const waitCols = [11, 13, 15, 17, 18, 20, 22];
    for (const c of waitCols) {
      const colLetter = ws.getColumn(c).letter;
      ws.getCell(jRow, c).value = {
        formula: `${colLetter}${kekuranganRow}/${colLetter}${standarRow}`,
      };
    }
    for (let c = 1; c <= 23; c++) {
      ws.getCell(jRow, c).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFFF00" },
      };
    }

    // Border seluruh area (baris 4 s.d. jRow)
    for (let r = 4; r <= jRow; r++) {
      for (let c = 1; c <= 23; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    // Number format
    for (let r = 5; r <= jRow; r++) {
      for (let c = 9; c <= 22; c++) {
        ws.getCell(r, c).numFmt = "#,##0";
      }
      ws.getCell(r, 23).numFmt = "#,##0.00";
    }
    for (let c = 11; c <= 22; c++) {
      ws.getCell(kekuranganRow, c).numFmt = "#,##0.00";
    }

    ws.getColumn(7).width = 40; // NAMA
    ws.getColumn(8).width = 20; // FINISHING
    for (let c = 2; c <= 23; c++) {
      if (c !== 7 && c !== 8) ws.getColumn(c).width = 14;
    }

    // Hide kolom PO (J, L, N, O, P, S, U) — persis Delphi
    [10, 12, 14, 15, 16, 19, 21].forEach((c) => {
      ws.getColumn(c).hidden = true;
    });

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Monitoring_Kekurangan_Produksi_Formatted_${dtAwal.value}.xlsx`,
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
    title="Laporan Monitoring Kekurangan Produksi"
    :menu-id="menuId"
    :icon="IconAlertTriangle"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="Spk"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">SPK dari Tanggal</span>
        <input type="date" v-model="dtAwal" class="f-date" />
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
        to Excel
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{ formatTgl(item.Tanggal) }}</template>
    <template #item.Dateline="{ item }">{{
      formatTgl(item.Dateline)
    }}</template>
    <template #item.JmlSpk="{ item }">{{ numFmt(item.JmlSpk) }}</template>
    <template #item.Potong="{ item }">
      <span :class="{ 'text-kurang': Number(item.Potong) < 0 }">{{
        numFmt(item.Potong)
      }}</span>
    </template>
    <template #item.Cetak="{ item }">
      <span :class="{ 'text-kurang': Number(item.Cetak) < 0 }">{{
        numFmt(item.Cetak)
      }}</span>
    </template>
    <template #item.HotPres="{ item }">
      <span :class="{ 'text-kurang': Number(item.HotPres) < 0 }">{{
        numFmt(item.HotPres)
      }}</span>
    </template>
    <template #item.QcCetak="{ item }">
      <span :class="{ 'text-kurang': Number(item.QcCetak) < 0 }">{{
        numFmt(item.QcCetak)
      }}</span>
    </template>
    <template #item.DC="{ item }">
      <span :class="{ 'text-kurang': Number(item.DC) < 0 }">{{
        numFmt(item.DC)
      }}</span>
    </template>
    <template #item.Jahit="{ item }">
      <span :class="{ 'text-kurang': Number(item.Jahit) < 0 }">{{
        numFmt(item.Jahit)
      }}</span>
    </template>
    <template #item.Lipat="{ item }">
      <span :class="{ 'text-kurang': Number(item.Lipat) < 0 }">{{
        numFmt(item.Lipat)
      }}</span>
    </template>
    <template #item.KedatanganBahanCuting="{ item }">{{
      numFmt(item.KedatanganBahanCuting, 2)
    }}</template>
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
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}
.text-kurang {
  color: #c62828;
  font-weight: 700;
}
</style>
