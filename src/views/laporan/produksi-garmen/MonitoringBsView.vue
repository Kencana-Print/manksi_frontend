<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { monitoringBsService } from "@/services/laporan/produksi-garmen/monitoringBsService";
import { formatTanggal } from "@/utils/dateFormat";
import { IconAlertTriangle, IconFileSpreadsheet } from "@tabler/icons-vue";

const toast = useToast();
const menuId = "563";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const dtAwal = ref(toLocalDateStr(firstDayOfMonth));

const cab = ref("P04");

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await monitoringBsService.getBrowse(dtAwal.value, cab.value);
    return res.data.data;
  },
  immediate: true,
});

watch([dtAwal, cab], fetchData);

const headers = [
  { title: "SPK", key: "SPK", width: "130px" },
  { title: "Tgl SPK", key: "TglSPK", width: "95px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Nama", key: "Nama", minWidth: "260px" },
  { title: "Finishing", key: "Finishing", minWidth: "200px" },
];

// ── Master-detail (row expand) ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const spk = typeof v === "object" ? v.SPK : v;
    if (!spk || detailData.value[spk]) continue;
    detailLoading.value[spk] = true;
    try {
      const res = await monitoringBsService.getDetail(spk);
      detailData.value[spk] = res.data.data || [];
    } catch {
      detailData.value[spk] = [];
    } finally {
      detailLoading.value[spk] = false;
    }
  }
};

const numFmt = (v: any) => Number(v || 0).toLocaleString("id-ID");

// ── Export — reuse flow all-detail via loop getDetail per master row ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const master = items.value ?? [];
  if (!master.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    const spkInfoMap = new Map(master.map((m: any) => [m.SPK, m]));
    const allRows: any[] = [];
    for (const m of master) {
      const res = await monitoringBsService.getDetail(m.SPK);
      const dtl = res.data.data || [];
      for (const d of dtl) allRows.push(d);
    }
    if (!allRows.length) {
      toast.warning("Tidak ada data detail.");
      return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("Monitoring BS");

    ws.getCell(1, 1).value = "LAPORAN MONITORING BS";
    ws.getCell(1, 1).font = { bold: true, size: 12 };
    ws.getCell(2, 1).value = `DIVISI GARMEN ${cab.value}`;
    ws.getCell(2, 1).font = { bold: true };
    ws.getCell(3, 1).value =
      `SPK DARI TANGGAL : ${formatTanggal(dtAwal.value)}`;
    ws.getCell(3, 1).font = { bold: true };

    const mergeSingle = (col: number, label: string) => {
      ws.mergeCells(4, col, 5, col);
      ws.getCell(4, col).value = label;
    };
    mergeSingle(1, "NO");
    mergeSingle(2, "SPK");
    mergeSingle(3, "TANGGAL");
    mergeSingle(4, "CAB");
    mergeSingle(5, "DIVISI");
    mergeSingle(6, "NAMA SPK");
    mergeSingle(7, "FINISHING");
    mergeSingle(8, "KOMPONEN");

    const groupDefs: [number, number, string][] = [
      [9, 11, "CUTT"],
      [12, 14, "QC CUTT"],
      [15, 17, "BORDIR"],
      [18, 20, "CETAK"],
      [21, 23, "QC CETAK"],
      [24, 26, "SEWING"],
    ];
    for (const [start, end, label] of groupDefs) {
      ws.mergeCells(4, start, 4, end);
      ws.getCell(4, start).value = label;
    }
    ws.mergeCells(4, 27, 4, 30);
    ws.getCell(4, 27).value = "GANTI BS";

    const subLabels = ["BS KAIN", "BS SABLON", "BS LINI"];
    for (const [start] of groupDefs) {
      subLabels.forEach((lbl, i) => (ws.getCell(5, start + i).value = lbl));
    }
    ["CUTING", "CETAK", "BORDIR", "JAHIT"].forEach(
      (lbl, i) => (ws.getCell(5, 27 + i).value = lbl),
    );

    const skyBlue = "FF87CEEB";
    const yellow = "FFFFFF00";
    for (let r = 4; r <= 5; r++) {
      for (let c = 1; c <= 26; c++) {
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
      for (let c = 27; c <= 30; c++) {
        const cell = ws.getCell(r, c);
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: yellow },
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
    let no = 1;
    for (const d of allRows) {
      const spkInfo: any = spkInfoMap.get(d.SPK) || {};
      ws.getCell(jRow, 1).value = no;
      ws.getCell(jRow, 2).value = d.SPK;
      ws.getCell(jRow, 3).value = formatTanggal(spkInfo.TglSPK);
      ws.getCell(jRow, 4).value = spkInfo.Cab;
      ws.getCell(jRow, 5).value = spkInfo.Divisi;
      ws.getCell(jRow, 6).value = spkInfo.Nama;
      ws.getCell(jRow, 7).value = spkInfo.Finishing;
      ws.getCell(jRow, 8).value = d.Komponen;
      ws.getCell(jRow, 9).value = Number(d.KainCuting || 0);
      ws.getCell(jRow, 10).value = Number(d.SablonCuting || 0);
      ws.getCell(jRow, 11).value = Number(d.LiniCuting || 0);
      ws.getCell(jRow, 12).value = Number(d.KainQcCuting || 0);
      ws.getCell(jRow, 13).value = Number(d.SablonQcCuting || 0);
      ws.getCell(jRow, 14).value = Number(d.LiniQcCuting || 0);
      ws.getCell(jRow, 15).value = Number(d.KainBordir || 0);
      ws.getCell(jRow, 16).value = Number(d.SablonBordir || 0);
      ws.getCell(jRow, 17).value = Number(d.LiniBordir || 0);
      ws.getCell(jRow, 18).value = Number(d.KainCetak || 0);
      ws.getCell(jRow, 19).value = Number(d.SablonCetak || 0);
      ws.getCell(jRow, 20).value = Number(d.LiniCetak || 0);
      ws.getCell(jRow, 21).value = Number(d.KainQcCetak || 0);
      ws.getCell(jRow, 22).value = Number(d.SablonQcCetak || 0);
      ws.getCell(jRow, 23).value = Number(d.LiniQcCetak || 0);
      ws.getCell(jRow, 24).value = Number(d.KainJahit || 0);
      ws.getCell(jRow, 25).value = Number(d.SablonJahit || 0);
      ws.getCell(jRow, 26).value = Number(d.LiniJahit || 0);
      ws.getCell(jRow, 27).value = Number(d.GantiBsCuting || 0);
      ws.getCell(jRow, 28).value = Number(d.GantiBsCetak || 0);
      ws.getCell(jRow, 29).value = Number(d.GantiBsBordir || 0);
      ws.getCell(jRow, 30).value = Number(d.GantiBsJahit || 0);
      jRow++;
      no++;
    }
    const lastRow = jRow - 1;

    for (let r = 4; r <= lastRow; r++) {
      for (let c = 1; c <= 30; c++) {
        ws.getCell(r, c).border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      }
    }
    for (let r = 6; r <= lastRow; r++) {
      for (let c = 9; c <= 30; c++) ws.getCell(r, c).numFmt = "#,##0";
    }

    ws.getColumn(1).width = 5;
    ws.getColumn(6).width = 30;
    ws.getColumn(7).width = 20;
    ws.getColumn(8).width = 20;
    for (let c = 9; c <= 30; c++) ws.getColumn(c).width = 10;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `Monitoring_BS_${dtAwal.value}.xlsx`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Laporan Monitoring BS"
    :menu-id="menuId"
    :icon="IconAlertTriangle"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    item-value="SPK"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">SPK dari Tanggal</span>
        <input type="date" v-model="dtAwal" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Workshop</span>
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
        color="green"
        :loading="isExporting"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>

    <template #item.TglSPK="{ item }">{{
      formatTanggal(item.TglSPK)
    }}</template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.SPK]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <div v-else class="table-scroll">
          <table class="bs-table">
            <thead>
              <tr>
                <th rowspan="2" style="min-width: 160px">Komponen</th>
                <th colspan="3">Cuting</th>
                <th colspan="3">QC Cuting</th>
                <th colspan="3">Bordir</th>
                <th colspan="3">Cetak</th>
                <th colspan="3">QC Cetak</th>
                <th colspan="3">Sewing</th>
                <th colspan="4" class="grp-yellow">Ganti BS</th>
              </tr>
              <tr>
                <th>Kain</th>
                <th>Sablon</th>
                <th>Lini</th>
                <th>Kain</th>
                <th>Sablon</th>
                <th>Lini</th>
                <th>Kain</th>
                <th>Sablon</th>
                <th>Lini</th>
                <th>Kain</th>
                <th>Sablon</th>
                <th>Lini</th>
                <th>Kain</th>
                <th>Sablon</th>
                <th>Lini</th>
                <th>Kain</th>
                <th>Sablon</th>
                <th>Lini</th>
                <th class="grp-yellow">Cuting</th>
                <th class="grp-yellow">Cetak</th>
                <th class="grp-yellow">Bordir</th>
                <th class="grp-yellow">Jahit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailData[item.SPK]" :key="i">
                <td class="font-weight-bold text-primary">{{ d.Komponen }}</td>
                <td class="tr">{{ numFmt(d.KainCuting) }}</td>
                <td class="tr">{{ numFmt(d.SablonCuting) }}</td>
                <td class="tr">{{ numFmt(d.LiniCuting) }}</td>
                <td class="tr">{{ numFmt(d.KainQcCuting) }}</td>
                <td class="tr">{{ numFmt(d.SablonQcCuting) }}</td>
                <td class="tr">{{ numFmt(d.LiniQcCuting) }}</td>
                <td class="tr">{{ numFmt(d.KainBordir) }}</td>
                <td class="tr">{{ numFmt(d.SablonBordir) }}</td>
                <td class="tr">{{ numFmt(d.LiniBordir) }}</td>
                <td class="tr">{{ numFmt(d.KainCetak) }}</td>
                <td class="tr">{{ numFmt(d.SablonCetak) }}</td>
                <td class="tr">{{ numFmt(d.LiniCetak) }}</td>
                <td class="tr">{{ numFmt(d.KainQcCetak) }}</td>
                <td class="tr">{{ numFmt(d.SablonQcCetak) }}</td>
                <td class="tr">{{ numFmt(d.LiniQcCetak) }}</td>
                <td class="tr">{{ numFmt(d.KainJahit) }}</td>
                <td class="tr">{{ numFmt(d.SablonJahit) }}</td>
                <td class="tr">{{ numFmt(d.LiniJahit) }}</td>
                <td class="tr">{{ numFmt(d.GantiBsCuting) }}</td>
                <td class="tr">{{ numFmt(d.GantiBsCetak) }}</td>
                <td class="tr">{{ numFmt(d.GantiBsBordir) }}</td>
                <td class="tr">{{ numFmt(d.GantiBsJahit) }}</td>
              </tr>
              <tr v-if="!detailData[item.SPK]?.length">
                <td colspan="22" class="empty-row">Tidak ada rincian BS.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 4px;
}
.detail-wrap {
  padding: 10px 14px 16px;
  background: #f5f7fb;
  border-top: 2px solid #dde3ea;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 12px;
  color: #555;
}
.table-scroll {
  overflow-x: auto;
}
.bs-table {
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  white-space: nowrap;
}
.bs-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 5px 8px;
  text-align: center;
  font-weight: 700;
  border: 1px solid #cfd8dc;
}
.grp-yellow {
  background: #fff9c4 !important;
}
.bs-table tbody td {
  padding: 4px 8px;
  border: 1px solid #f0f0f0;
}
.tr {
  text-align: right;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  padding: 14px;
  font-style: italic;
}
</style>
