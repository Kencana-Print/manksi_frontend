<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkVsPoService } from "@/services/laporan/gudang-garmen/spkVsPoService";
import { IconFileInvoice, IconFileSpreadsheet } from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const menuId = "520";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

const filters = ref({
  startDate: toLocalDateStr(firstDayOfMonth),
  endDate: toLocalDateStr(today),
});

const masterHeaders = [
  { title: "Spk Nomor", key: "SpkNomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Spk Nama", key: "SpkNama", minWidth: "260px" },
  { title: "Kain", key: "Kain", width: "160px" },
  { title: "Finishing", key: "Finishing", minWidth: "200px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await spkVsPoService.getBrowse(
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
    const nomor = typeof v === "object" ? v.SpkNomor : v;
    if (!nomor || detailData.value[nomor]) continue;
    detailLoading.value[nomor] = true;
    try {
      const res = await spkVsPoService.getDetail(nomor);
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
  return `${d}-${m}-${y}`;
};

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Spk Nomor", key: "SpkNomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Customer", key: "Customer", width: 24 },
      { header: "Spk Nama", key: "SpkNama", width: 30 },
      { header: "Kain", key: "Kain", width: 20 },
      { header: "Finishing", key: "Finishing", width: 26 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcelSingle(
      `SPK_vs_PO_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "SPK vs PO",
      columns,
      items.value,
      "LAPORAN SPK VS PO",
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
    const res = await spkVsPoService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Spk Nama", key: "SpkNama", width: 28 },
      { header: "Customer", key: "Customer", width: 22 },
      { header: "Spk Nomor", key: "SpkNomor", width: 16 },
      { header: "Nomor PO", key: "NomorPo", width: 16 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Nama Bahan", key: "NamaBahan", width: 24 },
      { header: "Satuan", key: "Satuan", width: 10 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Terima",
        key: "Terima",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcel(
      `SPK_vs_PO_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Detail PO",
          columns,
          rows,
          title: "RINCIAN SPK VS PO",
        },
      ],
    );
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
    title="SPK vs PO"
    :menu-id="menuId"
    :icon="IconFileInvoice"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="SpkNomor"
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
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
        Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{ fmtDate(item.Tanggal) }}</template>
    <template #item.Dateline="{ item }">{{ fmtDate(item.Dateline) }}</template>
    <template #item.Jumlah="{ item }">{{ fmtNum(item.Jumlah) }}</template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.SpkNomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 130px">Nomor PO</th>
              <th style="width: 95px">Tanggal</th>
              <th style="width: 110px">Kode</th>
              <th style="min-width: 200px">Nama Bahan</th>
              <th style="width: 70px">Satuan</th>
              <th style="width: 90px" class="tr">Jumlah</th>
              <th style="width: 90px" class="tr">Terima</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, i) in detailData[item.SpkNomor]"
              :key="i"
              :class="{
                'row-belum-terima': Number(d.Terima) < Number(d.Jumlah),
              }"
            >
              <td class="font-weight-bold text-primary">{{ d.NomorPo }}</td>
              <td>{{ fmtDate(d.Tanggal) }}</td>
              <td>{{ d.Kode }}</td>
              <td>{{ d.NamaBahan }}</td>
              <td>{{ d.Satuan }}</td>
              <td class="tr">{{ fmtNum(d.Jumlah) }}</td>
              <td class="tr">{{ fmtNum(d.Terima) }}</td>
            </tr>
            <tr v-if="!detailData[item.SpkNomor]?.length">
              <td colspan="7" class="empty-row">Tidak ada rincian PO.</td>
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
.row-belum-terima td {
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
