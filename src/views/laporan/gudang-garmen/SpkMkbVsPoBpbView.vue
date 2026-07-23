<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkMkbVsPoBpbService } from "@/services/laporan/gudang-garmen/spkMkbVsPoBpbService";
import { IconFileAnalytics, IconFileSpreadsheet } from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const menuId = "519";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();

const filters = ref({
  startDate: toLocalDateStr(today),
  endDate: toLocalDateStr(today),
});

const masterHeaders = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tgl SPK", key: "Tglspk", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Nama SPK", key: "NamaSPK", minWidth: "260px" },
  { title: "Jml SPK", key: "JmlSpk", width: "90px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await spkMkbVsPoBpbService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([() => filters.value.startDate, () => filters.value.endDate], fetchData);

// ── Master-detail (row expand) ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const nomor = typeof v === "object" ? v.Nomor : v;
    if (!nomor || detailData.value[nomor]) continue;
    detailLoading.value[nomor] = true;
    try {
      const res = await spkMkbVsPoBpbService.getDetail(nomor);
      detailData.value[nomor] = res.data.data || [];
    } catch {
      detailData.value[nomor] = [];
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

const fmtNum = (val: any, d = 2) =>
  Number(val || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const fmtDate = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

// ── Export master (flat) ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tgl SPK", key: "Tglspk", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Nama SPK", key: "NamaSPK", width: 30 },
      {
        header: "Jml SPK",
        key: "JmlSpk",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcelSingle(
      `SPK_MKB_vs_PO_BPB_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "SPK MKB vs PO BPB",
      columns,
      items.value,
      "LAPORAN SPK MKB VS PO BPB",
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Export detail (flat, semua baris bahan per SPK) ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await spkMkbVsPoBpbService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Nama SPK", key: "NamaSPK", width: 26 },
      { header: "Nomor", key: "Nomor", width: 16 },
      { header: "No MKB", key: "Mkb", width: 16 },
      { header: "Tgl MKB", key: "TglMkb", width: 12, align: "center" },
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Nama Bahan", key: "NamaBahan", width: 24 },
      { header: "Satuan", key: "Satuan", width: 10 },
      {
        header: "Butuh",
        key: "Butuh",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Ready",
        key: "Ready",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Akan PO",
        key: "AkanPo",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Sudah PO",
        key: "SudahPo",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "BPB",
        key: "Bpb",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "BPB Non PO",
        key: "BpbNonPo",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Kurang",
        key: "Kurang",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcel(
      `SPK_MKB_vs_PO_BPB_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Detail Bahan",
          columns,
          rows,
          title: "RINCIAN SPK MKB VS PO BPB",
        },
      ],
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── Export to Excel (cascade, replikasi struktur nested Delphi) ──
const isExportingCascade = ref(false);
const onExportCascade = async () => {
  isExportingCascade.value = true;
  try {
    const res = await spkMkbVsPoBpbService.getExportCascade(
      filters.value.startDate,
      filters.value.endDate,
    );
    const data = res.data.data || [];
    if (!data.length) {
      toast.warning("Tidak ada data pada filter ini.");
      return;
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "MANKSI ERP";
    wb.created = new Date();
    const ws = wb.addWorksheet("SPK_MKB vs PO_BPB");

    ws.mergeCells(1, 1, 1, 23);
    ws.getCell(1, 1).value = "LAPORAN SPK_MKB vs PO_BPB";
    ws.getCell(1, 1).font = { bold: true, size: 13 };

    ws.getCell(2, 1).value = `TANGGAL: ${fmtDate(
      filters.value.startDate,
    )} s.d ${fmtDate(filters.value.endDate)}`;
    ws.getCell(2, 1).font = { bold: true };

    const headers = [
      "NO",
      "SPK",
      "TGL SPK",
      "DATELINE",
      "NAMA SPK",
      "JML SPK",
      "NO.MKB",
      "TGL MKB",
      "KODE BAHAN",
      "NAMA BAHAN",
      "SATUAN",
      "BUTUH",
      "READY",
      "AKAN PO",
      "NO.PO",
      "TGL PO",
      "JML PO",
      "BPB",
      "TGL BPB",
      "JML BPB",
      "BPB NONPO",
      "TGL BPB",
      "JML BPB",
    ];
    const headerRow = ws.getRow(3);
    headers.forEach((h, i) => (headerRow.getCell(i + 1).value = h));
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF87CEEB" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    let jRow = 4;
    let no = 0;

    for (const spk of data) {
      no += 1;
      const spkBase: (string | number)[] = [
        no,
        spk.Nomor,
        fmtDate(spk.Tglspk),
        fmtDate(spk.Dateline),
        spk.NamaSPK,
        Number(spk.JmlSpk || 0),
      ];

      if (!spk.mkbList || spk.mkbList.length === 0) {
        spkBase.forEach((v, i) => (ws.getCell(jRow, i + 1).value = v));
        jRow += 1;
        continue;
      }

      let spkWritten = false;
      for (const mkb of spk.mkbList) {
        const mkbBase: (string | number)[] = [
          mkb.MkbNomor,
          fmtDate(mkb.TglMkb),
          mkb.Kode,
          mkb.NamaBahan,
          mkb.Satuan,
          Number(mkb.Butuh || 0),
          Number(mkb.Ready || 0),
          Number(mkb.AkanPo || 0),
        ];

        // Gabungkan entri PO+BPB dan BPBnonPO jadi satu list baris
        // per MKB, biar tampilannya "menjorok" seperti Delphi.
        const combined: Record<string, any>[] = [];
        for (const po of mkb.poList || []) {
          if (po.bpbList && po.bpbList.length) {
            for (const bpb of po.bpbList) {
              combined.push({
                NoPo: po.PoNomor,
                TglPo: po.TglPo,
                JmlPo: po.JmlPo,
                NoBpb: bpb.BpbNomor,
                TglBpb: bpb.TglBpb,
                JmlBpb: bpb.JmlBpb,
              });
            }
          } else {
            combined.push({
              NoPo: po.PoNomor,
              TglPo: po.TglPo,
              JmlPo: po.JmlPo,
            });
          }
        }
        for (const bnp of mkb.bpbNonPoList || []) {
          combined.push({
            NoBpbNonPo: bnp.BpbNomor,
            TglBpbNonPo: bnp.TglBpb,
            JmlBpbNonPo: bnp.JmlBpb,
          });
        }

        if (combined.length === 0) {
          const rowVals = [
            ...(spkWritten ? Array(6).fill("") : spkBase),
            ...mkbBase,
          ];
          rowVals.forEach((v, i) => (ws.getCell(jRow, i + 1).value = v));
          spkWritten = true;
          jRow += 1;
        } else {
          combined.forEach((entry, i) => {
            const rowVals: (string | number)[] = [
              ...(spkWritten ? Array(6).fill("") : spkBase),
              ...(i === 0 ? mkbBase : Array(8).fill("")),
              entry.NoPo ?? "",
              entry.TglPo ? fmtDate(entry.TglPo) : "",
              entry.JmlPo !== undefined ? Number(entry.JmlPo) : "",
              entry.NoBpb ?? "",
              entry.TglBpb ? fmtDate(entry.TglBpb) : "",
              entry.JmlBpb !== undefined ? Number(entry.JmlBpb) : "",
              entry.NoBpbNonPo ?? "",
              entry.TglBpbNonPo ? fmtDate(entry.TglBpbNonPo) : "",
              entry.JmlBpbNonPo !== undefined ? Number(entry.JmlBpbNonPo) : "",
            ];
            rowVals.forEach((v, ci) => (ws.getCell(jRow, ci + 1).value = v));
            spkWritten = true;
            jRow += 1;
          });
        }
      }
    }

    ws.getColumn(1).width = 6;
    ws.getColumn(2).width = 16;
    ws.getColumn(3).width = 12;
    ws.getColumn(4).width = 12;
    ws.getColumn(5).width = 32;
    for (let c = 6; c <= 23; c++) ws.getColumn(c).width = 14;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `SPK_MKB_vs_PO_BPB_Cascade_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
    );
  } catch {
    toast.error("Gagal export to Excel.");
  } finally {
    isExportingCascade.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="SPK MKB vs PO BPB"
    :menu-id="menuId"
    :icon="IconFileAnalytics"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Tanggal</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="success"
        class="mr-1"
        :loading="isExporting"
        @click="onExportMaster"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="teal-darken-1"
        class="mr-1"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        Detail
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="indigo-darken-1"
        :loading="isExportingCascade"
        @click="onExportCascade"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        to Excel
      </v-btn>
    </template>

    <template #item.Tglspk="{ item }">{{ fmtDate(item.Tglspk) }}</template>
    <template #item.Dateline="{ item }">{{ fmtDate(item.Dateline) }}</template>
    <template #item.JmlSpk="{ item }">{{ fmtNum(item.JmlSpk) }}</template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 140px">Nomor</th>
              <th style="width: 130px">MKB</th>
              <th style="width: 90px">Tgl MKB</th>
              <th style="width: 110px">Kode</th>
              <th style="min-width: 200px">Nama Bahan</th>
              <th style="width: 70px">Satuan</th>
              <th style="width: 85px" class="tr">Butuh</th>
              <th style="width: 85px" class="tr">Ready</th>
              <th style="width: 85px" class="tr">Akan PO</th>
              <th style="width: 85px" class="tr">Sudah PO</th>
              <th style="width: 80px" class="tr">BPB</th>
              <th style="width: 90px" class="tr">BPB Non PO</th>
              <th style="width: 85px" class="tr">Kurang</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, i) in detailData[item.Nomor]"
              :key="i"
              :class="{ 'row-kurang': Number(d.Kurang) > 0 }"
            >
              <td class="font-weight-bold text-primary">{{ d.Nomor }}</td>
              <td>{{ d.Mkb }}</td>
              <td>{{ fmtDate(d.TglMkb) }}</td>
              <td>{{ d.Kode }}</td>
              <td>{{ d.NamaBahan }}</td>
              <td>{{ d.Satuan }}</td>
              <td class="tr">{{ fmtNum(d.Butuh) }}</td>
              <td class="tr">{{ fmtNum(d.Ready) }}</td>
              <td class="tr">{{ fmtNum(d.AkanPo) }}</td>
              <td class="tr">{{ fmtNum(d.SudahPo) }}</td>
              <td class="tr">{{ fmtNum(d.Bpb) }}</td>
              <td class="tr">{{ fmtNum(d.BpbNonPo) }}</td>
              <td class="tr">{{ fmtNum(d.Kurang) }}</td>
            </tr>
            <tr v-if="!detailData[item.Nomor]?.length">
              <td colspan="13" class="empty-row">Tidak ada rincian.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
  margin-right: 6px;
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
.f-date:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #888;
  margin: 0 6px;
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
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  overflow: hidden;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  white-space: nowrap;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.row-kurang td {
  color: #c62828;
  font-weight: 600;
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
