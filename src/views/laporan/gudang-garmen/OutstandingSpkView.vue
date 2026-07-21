<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { laporanOutstandingSpkService } from "@/services/laporan/gudang-garmen/laporanOutstandingSpkService";
import { IconClipboardList, IconFileSpreadsheet } from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const menuId = "526";

const masterHeaders = [
  { title: "SPK", key: "SPK", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "300px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "end" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "end" },
  { title: "Jadi", key: "Jadi", width: "90px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await laporanOutstandingSpkService.getBrowse();
    return res.data.data;
  },
  immediate: true,
});

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
      const res = await laporanOutstandingSpkService.getDetail(spk);
      detailData.value[spk] = res.data.data || [];
    } catch {
      detailData.value[spk] = [];
    } finally {
      detailLoading.value[spk] = false;
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
  return `${d}-${m}-${y}`;
};

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "SPK", key: "SPK", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Nama", key: "Nama", width: 40 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Jadi",
        key: "Jadi",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcelSingle(
      `Outstanding_SPK.xlsx`,
      "Outstanding SPK",
      columns,
      items.value,
      "LAPORAN OUTSTANDING SPK",
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Export detail ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await laporanOutstandingSpkService.getAllDetail();
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Nama SPK", key: "Nama", width: 32 },
      { header: "SPK", key: "spk", width: 18 },
      { header: "Proses", key: "proses", width: 16 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "BS",
        key: "Bs",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcel(`Outstanding_SPK_Detail.xlsx`, [
      {
        sheetName: "Detail Proses",
        columns,
        rows,
        title: "RINCIAN OUTSTANDING SPK PER PROSES",
      },
    ]);
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Laporan Outstanding SPK"
    :menu-id="menuId"
    :icon="IconClipboardList"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="SPK"
    :is-loading="isLoading"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
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
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.Jumlah="{ item }">{{ fmtNum(item.Jumlah) }}</template>
    <template #item.Kirim="{ item }">{{ fmtNum(item.Kirim) }}</template>
    <template #item.Jadi="{ item }">{{ fmtNum(item.Jadi) }}</template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.SPK]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 140px">Proses</th>
              <th style="width: 110px" class="tr">Jumlah</th>
              <th style="width: 100px" class="tr">BS</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailData[item.SPK]" :key="i">
              <td class="font-weight-bold text-primary">{{ d.proses }}</td>
              <td class="tr">{{ fmtNum(d.Jumlah) }}</td>
              <td class="tr">{{ fmtNum(d.Bs) }}</td>
            </tr>
            <tr v-if="!detailData[item.SPK]?.length">
              <td colspan="3" class="empty-row">Tidak ada rincian proses.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
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
  max-width: 500px;
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
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
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
