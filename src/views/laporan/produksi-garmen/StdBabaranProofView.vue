<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { exportExcelSingle } from "@/utils/excelExport";
import { standarBabaranProofService } from "@/services/laporan/produksi-garmen/standarBabaranProofService";
import { formatTanggal } from "@/utils/dateFormat";
import { IconRuler2, IconFileSpreadsheet } from "@tabler/icons-vue";

const MENU_ID = "559";
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
  cab: "P04",
});

const { items, isLoading, selected, canExport, fetchData } = useBrowse({
  menuId: MENU_ID,
  fetchApi: async () => {
    const res = await standarBabaranProofService.getBrowse(
      filterState.value.dtAwal,
      filterState.value.dtAkhir,
      filterState.value.cab,
    );
    // _rowKey — data laporan gak punya kolom unik alami, dipakai buat item-value BaseBrowse
    return (res.data.data || []).map((r: any, i: number) => ({
      ...r,
      _rowKey: i,
    }));
  },
});

const headers = [
  { title: "Tanggal", key: "tanggal", width: "100px" },
  { title: "SPK", key: "spk", minWidth: "140px" },
  { title: "Nama Order", key: "namaOrder", minWidth: "240px" },
  { title: "Komponen", key: "komponen", minWidth: "180px" },
  { title: "Jenis Kain", key: "jenisKain", minWidth: "130px" },
  { title: "Warna Kain", key: "warnaKain", minWidth: "150px" },
  { title: "Gramasi", key: "gramasi", width: "90px", align: "end" },
  { title: "Setting", key: "setting", width: "90px" },
  { title: "STD Babaran", key: "stdBabaran", width: "110px", align: "end" },
  { title: "Rencana Order", key: "rencanaOrder", width: "110px", align: "end" },
  { title: "Kebutuhan", key: "kebutuhan", width: "100px", align: "end" },
  { title: "Satuan", key: "satuan", width: "80px" },
];

const numFmt = (v: any, d = 2) => {
  if (v === null || v === undefined || v === "") return "";
  return Number(v).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
};
const fmtTgl = (v: any) => (v ? formatTanggal(v) : "");

// ── Export "biasa" — reuse utility exportExcelSingle, signature positional:
// (filename, sheetName, columns, rows, title?) ──
const isExportingBiasa = ref(false);
const onExportBiasa = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const dataRows = items.value ?? [];
  if (!dataRows.length) return toast.warning("Tidak ada data.");
  isExportingBiasa.value = true;
  try {
    await exportExcelSingle(
      `Standar_Babaran_Proof_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
      "Standar Babaran Proof",
      [
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "SPK", key: "spk", width: 18 },
        { header: "Nama Order", key: "namaOrder", width: 32 },
        { header: "Komponen", key: "komponen", width: 20 },
        { header: "Jenis Kain", key: "jenisKain", width: 14 },
        { header: "Warna Kain", key: "warnaKain", width: 16 },
        {
          header: "Gramasi",
          key: "gramasi",
          width: 10,
          numFmt: "#,##0.00",
          align: "right",
        },
        { header: "Setting", key: "setting", width: 10 },
        {
          header: "STD Babaran",
          key: "stdBabaran",
          width: 12,
          numFmt: "#,##0.00",
          align: "right",
        },
        {
          header: "Rencana Order",
          key: "rencanaOrder",
          width: 14,
          numFmt: "#,##0",
          align: "right",
        },
        {
          header: "Kebutuhan",
          key: "kebutuhan",
          width: 12,
          numFmt: "#,##0.00",
          align: "right",
        },
        { header: "Satuan", key: "satuan", width: 10 },
      ],
      dataRows.map((r: any) => ({
        tanggal: fmtTgl(r.tanggal),
        spk: r.spk ?? "",
        namaOrder: r.namaOrder ?? "",
        komponen: r.komponen ?? "",
        jenisKain: r.jenisKain ?? "",
        warnaKain: r.warnaKain ?? "",
        gramasi: r.gramasi ?? 0,
        setting: r.setting ?? "",
        stdBabaran: r.stdBabaran ?? 0,
        rencanaOrder: r.rencanaOrder ?? 0,
        kebutuhan: r.kebutuhan ?? 0,
        satuan: r.satuan ?? "",
      })),
      "LAPORAN STANDAR BABARAN PROOF",
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExportingBiasa.value = false;
  }
};

// ── Export "Laporan" — styled, master-blank-repeat persis Delphi
// btnExportClick. Perlu merge cell + kondisional blank per baris,
// di luar kemampuan exportExcelSingle → tetap ExcelJS manual. ──
const isExportingLaporan = ref(false);
const onExportLaporan = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const dataRows = items.value ?? [];
  if (!dataRows.length) return toast.warning("Tidak ada data.");
  isExportingLaporan.value = true;
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Laporan Standar Babaran Proof");

    ws.mergeCells(1, 1, 1, 13);
    ws.getCell(1, 1).value = "LAPORAN STANDAR BABARAN PROOF";
    ws.mergeCells(2, 1, 2, 13);
    ws.getCell(2, 1).value = `GARMEN ${filterState.value.cab}`;
    ws.getCell(3, 1).value =
      `TANGGAL : ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`;

    const hdrs = [
      "NO",
      "TANGGAL",
      "NO SPK",
      "NAMA ORDER",
      "KOMPONEN",
      "JENIS BAHAN",
      "WARNA BAHAN",
      "GRAMASI",
      "SETTING KAIN",
      "STANDAR BABARAN",
      "RENCANA ORDER",
      "ESTIMASI KEBUTUHAN BAHAN",
      "SATUAN",
    ];
    hdrs.forEach((h, i) => (ws.getCell(4, i + 1).value = h));

    const skyBlue = "FF87CEEB";
    for (let c = 1; c <= 13; c++) {
      const cell = ws.getCell(4, c);
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
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).font = { bold: true };
    ws.getRow(2).alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(3).font = { bold: true };

    let jRow = 5;
    let n = 0;
    let prevTgl = "";
    let prevSpk = "";
    for (const r of items.value as any[]) {
      const curTgl = r.tanggal ?? "";
      const curSpk = r.spk ?? "";
      const isNewGroup = curTgl !== prevTgl || curSpk !== prevSpk;

      if (isNewGroup) {
        n++;
        ws.getCell(jRow, 1).value = n;
        ws.getCell(jRow, 2).value = fmtTgl(r.tanggal);
        ws.getCell(jRow, 3).value = r.spk ?? "";
        ws.getCell(jRow, 4).value = r.namaOrder ?? "";
      }
      ws.getCell(jRow, 5).value = r.komponen ?? "";
      ws.getCell(jRow, 6).value = r.jenisKain ?? "";
      ws.getCell(jRow, 7).value = r.warnaKain ?? "";
      ws.getCell(jRow, 8).value = r.gramasi ?? 0;
      ws.getCell(jRow, 9).value = r.setting ?? "";
      ws.getCell(jRow, 10).value = r.stdBabaran ?? 0;
      ws.getCell(jRow, 11).value = r.rencanaOrder ?? 0;
      ws.getCell(jRow, 12).value = r.kebutuhan ?? 0;
      ws.getCell(jRow, 13).value = r.satuan ?? "";

      prevTgl = curTgl;
      prevSpk = curSpk;
      jRow++;
    }
    const lastRow = jRow - 1;

    for (let r = 4; r <= lastRow; r++) {
      for (let c = 1; c <= 13; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }

    ws.getColumn(10).numFmt = "#,##0.00";
    ws.getColumn(11).numFmt = "#,##0";
    ws.getColumn(12).numFmt = "#,##0.00";
    ws.getColumn(1).width = 5;
    ws.getColumn(4).width = 40;
    for (let c = 8; c <= 13; c++) ws.getColumn(c).width = 12;
    ws.getRow(4).height = 30;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Laporan_Standar_Babaran_Proof_${filterState.value.dtAwal}_${filterState.value.dtAkhir}.xlsx`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExportingLaporan.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Laporan Standar Babaran Proof"
    :menu-id="MENU_ID"
    :icon="IconRuler2"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    item-value="_rowKey"
    :can-export="false"
    search-placeholder="Cari SPK / Nama Order / Komponen..."
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">MAP dari Tanggal</span>
      <input
        type="date"
        v-model="filterState.dtAwal"
        class="f-date"
        @change="fetchData"
      />
      <span class="f-sep">s.d</span>
      <input
        type="date"
        v-model="filterState.dtAkhir"
        class="f-date"
        @change="fetchData"
      />
      <div class="f-divider" />
      <span class="f-label">Workshop</span>
      <select v-model="filterState.cab" class="f-select" @change="fetchData">
        <option value="ALL">ALL</option>
        <option value="P01">P01</option>
        <option value="P04">P04</option>
      </select>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="green"
        :loading="isExportingBiasa"
        :disabled="!items?.length"
        @click="onExportBiasa"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
      <v-btn
        size="small"
        color="teal"
        :loading="isExportingLaporan"
        :disabled="!items?.length"
        @click="onExportLaporan"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        Laporan
      </v-btn>
    </template>

    <template #item.tanggal="{ item }">{{ fmtTgl(item.tanggal) }}</template>
    <template #item.gramasi="{ item }">{{ numFmt(item.gramasi) }}</template>
    <template #item.stdBabaran="{ item }">{{
      numFmt(item.stdBabaran)
    }}</template>
    <template #item.rencanaOrder="{ item }">{{
      numFmt(item.rencanaOrder, 0)
    }}</template>
    <template #item.kebutuhan="{ item }">{{ numFmt(item.kebutuhan) }}</template>
  </BaseBrowse>
</template>

<style scoped>
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
</style>
