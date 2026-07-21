<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { outstandingPoMitraService } from "@/services/laporan/gudang-garmen/outstandingPoMitraService";
import { IconGauge, IconFileSpreadsheet } from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const menuId = "514";

// Helper: format Date ke "YYYY-MM-DD" pakai komponen LOKAL, bukan
// toISOString() yang convert ke UTC dulu dan bisa geser tanggal.
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
  cab: "ALL",
});

const masterHeaders = [
  { title: "Kode", key: "Kode", width: "90px" },
  { title: "Supplier", key: "Supplier", minWidth: "220px" },
  { title: "Jasa", key: "Jasa", width: "110px" },
  { title: "PO", key: "Po", width: "90px", align: "end" },
  { title: "Terima", key: "Terima", width: "90px", align: "end" },
  { title: "Kurang", key: "Kurang", width: "90px", align: "end" },
  { title: "Target", key: "Target", width: "90px", align: "end" },
  { title: "OTM", key: "Otm", width: "80px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await outstandingPoMitraService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.cab,
    );
    return res.data.data;
  },
  immediate: true,
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.cab,
  ],
  fetchData,
);

// ── Pewarnaan baris berdasarkan OTM — replikasi persis
// cxGrdMasterCustomDrawCell Delphi:
// OTM >= 3 → merah, 2 < OTM < 3 → biru, selain itu → default (hitam)
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const otm = Number(item?.Otm) || 0;
  if (otm >= 3) return { style: "color:#c62828; font-weight:600" };
  if (otm > 2 && otm < 3) return { style: "color:#1565c0; font-weight:600" };
  return {};
};

// ── Master-detail (row expand) ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const kode = typeof v === "object" ? v.Kode : v;
    if (!kode || detailData.value[kode]) continue;
    detailLoading.value[kode] = true;
    try {
      const res = await outstandingPoMitraService.getDetail(
        kode,
        filters.value.startDate,
        filters.value.endDate,
        filters.value.cab,
      );
      detailData.value[kode] = res.data.data || [];
    } catch {
      detailData.value[kode] = [];
    } finally {
      detailLoading.value[kode] = false;
    }
  }
};

const fmtNum = (val: any, d = 0) =>
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
      { header: "Kode", key: "Kode", width: 12 },
      { header: "Supplier", key: "Supplier", width: 30 },
      { header: "Jasa", key: "Jasa", width: 16 },
      { header: "PO", key: "Po", width: 12, align: "right", numFmt: "#,##0" },
      {
        header: "Terima",
        key: "Terima",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang",
        key: "Kurang",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Target",
        key: "Target",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "OTM",
        key: "Otm",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcelSingle(
      `Outstanding_PO_Mitra_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "Outstanding PO Mitra",
      columns,
      items.value,
      "LAPORAN OUTSTANDING PO MITRA (JASA JAHIT)",
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
    const res = await outstandingPoMitraService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.cab,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 12 },
      { header: "Supplier", key: "Supplier", width: 28 },
      { header: "Nomor PO", key: "Nomor", width: 16 },
      { header: "Tgl PO", key: "TanggalPo", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Gudang", key: "Gudang", width: 10 },
      { header: "Jasa", key: "Jasa", width: 14 },
      { header: "SPK", key: "Spk", width: 18 },
      { header: "Nama", key: "Nama", width: 26 },
      {
        header: "Jml PO",
        key: "JmlPo",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jml Terima",
        key: "JmlTerima",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kurang",
        key: "Kurang",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];
    await exportExcel(
      `Outstanding_PO_Mitra_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Detail PO",
          columns,
          rows,
          title: "RINCIAN OUTSTANDING PO MITRA",
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
    title="Outstanding PO Mitra"
    :menu-id="menuId"
    :icon="IconGauge"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Kode"
    :is-loading="isLoading"
    show-expand
    :expanded="expandedRows"
    :row-props-fn="rowPropsFn"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Tanggal</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <span class="f-label">Cabang</span>
      <select v-model="filters.cab" class="f-sel">
        <option value="ALL">ALL</option>
        <option value="P01">P01</option>
        <option value="P04">P04</option>
      </select>

      <div class="f-divider" />

      <div class="legend">
        <span class="legend-item"><span class="dot dot-red" /> OTM &ge; 3</span>
        <span class="legend-item"><span class="dot dot-blue" /> OTM 2-3</span>
        <span class="legend-item"
          ><span class="dot dot-black" /> OTM &le; 2</span
        >
      </div>
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

    <template #item.Po="{ item }">{{ fmtNum(item.Po) }}</template>
    <template #item.Terima="{ item }">{{ fmtNum(item.Terima) }}</template>
    <template #item.Kurang="{ item }">{{ fmtNum(item.Kurang) }}</template>
    <template #item.Target="{ item }">{{ fmtNum(item.Target) }}</template>
    <template #item.Otm="{ item }">{{ fmtNum(item.Otm, 2) }}</template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Kode]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat rincian PO...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 130px">Nomor PO</th>
              <th style="width: 95px" class="tc">Tgl PO</th>
              <th style="width: 95px" class="tc">Dateline</th>
              <th style="width: 70px">Gudang</th>
              <th style="width: 130px">SPK</th>
              <th style="min-width: 200px">Nama</th>
              <th style="width: 90px" class="tr">Jml PO</th>
              <th style="width: 90px" class="tr">Terima</th>
              <th style="width: 90px" class="tr">Kurang</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailData[item.Kode]" :key="i">
              <td class="font-weight-bold text-primary">{{ d.Nomor }}</td>
              <td class="tc">{{ fmtDate(d.TanggalPo) }}</td>
              <td class="tc">{{ fmtDate(d.Dateline) }}</td>
              <td>{{ d.Gudang }}</td>
              <td>{{ d.Spk }}</td>
              <td>{{ d.Nama }}</td>
              <td class="tr">{{ fmtNum(d.JmlPo) }}</td>
              <td class="tr">{{ fmtNum(d.JmlTerima) }}</td>
              <td class="tr">{{ fmtNum(d.Kurang) }}</td>
            </tr>
            <tr v-if="!detailData[item.Kode]?.length">
              <td colspan="9" class="empty-row">Tidak ada rincian PO.</td>
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
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 12px;
  display: inline-block;
}
.f-sel {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-sel:focus {
  border-color: #1976d2;
}

.legend {
  display: flex;
  align-items: center;
  gap: 12px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #555;
  white-space: nowrap;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}
.dot-red {
  background: #c62828;
}
.dot-blue {
  background: #1565c0;
}
.dot-black {
  background: #212121;
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
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.tc {
  text-align: center;
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
