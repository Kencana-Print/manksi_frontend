<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { stokDcService } from "@/services/laporan/gudang-garmen/stokDcService";
import { IconBuildingWarehouse, IconFileSpreadsheet } from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const menuId = "570";

const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1)
  .toISOString()
  .substring(0, 10);
const todayString = new Date().toISOString().substring(0, 10);

const filters = ref({
  startDate: firstDayOfYear,
  endDate: todayString,
  tampilkanKosong: false,
});

const masterHeaders = [
  { title: "No. SPK", key: "Spk", width: "140px" },
  { title: "Tgl SPK", key: "TanggalSpk", width: "100px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "200px" },
  { title: "Kode", key: "Kode", width: "110px" },
  { title: "Nama Komponen", key: "Nama", minWidth: "180px" },
  { title: "Size", key: "Size", width: "70px" },
  { title: "Satuan", key: "Satuan", width: "70px", align: "center" },
  { title: "Stok Awal", key: "StokAwal", width: "100px", align: "end" },
  { title: "Masuk", key: "Masuk", width: "90px", align: "end" },
  { title: "Keluar", key: "Keluar", width: "90px", align: "end" },
  { title: "Stok Akhir", key: "StokAkhir", width: "100px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await stokDcService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.tampilkanKosong,
    );
    return res.data.data;
  },
  immediate: true,
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.tampilkanKosong,
  ],
  () => {
    detailData.value = {};
    expandedRows.value = [];
    fetchData();
  },
);

// ── Master-detail (row expand) ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const item =
      typeof v === "object" ? v : items.value?.find((i: any) => i.RowKey === v);
    if (!item) continue;
    const key = item.RowKey;
    if (detailData.value[key]) continue;
    detailLoading.value[key] = true;
    try {
      const res = await stokDcService.getDetail(
        item.Spk,
        item.Kode,
        item.Size,
        filters.value.startDate,
        filters.value.endDate,
      );
      detailData.value[key] = res.data.data || [];
    } catch {
      detailData.value[key] = [];
    } finally {
      detailLoading.value[key] = false;
    }
  }
};

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "No. SPK", key: "Spk", width: 18 },
      { header: "Nama SPK", key: "NamaSpk", width: 26 },
      { header: "Kode", key: "Kode", width: 16 },
      { header: "Nama Komponen", key: "Nama", width: 24 },
      { header: "Size", key: "Size", width: 10 },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      {
        header: "Stok Awal",
        key: "StokAwal",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Masuk",
        key: "Masuk",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Keluar",
        key: "Keluar",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Stok Akhir",
        key: "StokAkhir",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];
    await exportExcelSingle(
      `Stok_Gudang_DC_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "Stok Gudang DC",
      columns,
      items.value,
      "LAPORAN STOK GUDANG DC P04 (MASTER)",
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
    const res = await stokDcService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.tampilkanKosong,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "No. SPK", key: "Spk", width: 18 },
      { header: "Tgl SPK", key: "TanggalSpk", width: 12, align: "center" },
      { header: "Nama SPK", key: "NamaSpk", width: 24 },
      { header: "Kode", key: "Kode", width: 16 },
      { header: "Nama Komponen", key: "Nama", width: 22 },
      { header: "Size", key: "Size", width: 10 },
      { header: "Nomor Mutasi", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Gudang Asal", key: "GudangAsal", width: 20 },
      { header: "Gudang Tujuan", key: "GudangTujuan", width: 20 },
      { header: "Arah", key: "Arah", width: 12 },
      {
        header: "Stok In",
        key: "StokIn",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Stok Out",
        key: "StokOut",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Stok Akhir",
        key: "StokAkhir",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];
    await exportExcel(
      `Stok_Gudang_DC_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Rincian Transaksi",
          columns,
          rows,
          title: "RINCIAN TRANSAKSI STOK GUDANG DC",
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
    title="Stok Gudang DC"
    :menu-id="menuId"
    :icon="IconBuildingWarehouse"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="RowKey"
    :is-loading="isLoading"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Filter Periode</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <label class="ck-lbl">
        <input type="checkbox" v-model="filters.tampilkanKosong" />
        Tampilkan Stok Kosong
      </label>
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

    <template #item.TanggalSpk="{ item }">
      {{ formatTanggal(item.TanggalSpk) }}
    </template>
    <template #item.StokAwal="{ item }">{{ fmtNum(item.StokAwal) }}</template>
    <template #item.Masuk="{ item }">{{ fmtNum(item.Masuk) }}</template>
    <template #item.Keluar="{ item }">{{ fmtNum(item.Keluar) }}</template>
    <template #item.StokAkhir="{ item }">
      <span
        :class="{ 'text-error font-weight-bold': Number(item.StokAkhir) < 0 }"
      >
        {{ fmtNum(item.StokAkhir) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.RowKey]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat transaksi...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 130px">Nomor Mutasi</th>
              <th style="width: 100px" class="tc">Tanggal</th>
              <th style="width: 150px">Gudang Asal</th>
              <th style="width: 150px">Gudang Tujuan</th>
              <th style="width: 80px" class="tc">Arah</th>
              <th style="width: 90px" class="tr">Stok In</th>
              <th style="width: 90px" class="tr">Stok Out</th>
              <th style="width: 90px" class="tr">Stok Akhir</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailData[item.RowKey]" :key="i">
              <td :class="{ 'font-weight-bold': d.Arah === 'Stok Awal' }">
                {{ d.Nomor || "-" }}
              </td>
              <td class="tc">
                {{ formatTanggal(d.Tanggal) }}
              </td>
              <td>{{ d.GudangAsal || "-" }}</td>
              <td>{{ d.GudangTujuan || "-" }}</td>
              <td class="tc">
                <span
                  v-if="d.Arah !== 'Stok Awal'"
                  class="arah-chip"
                  :class="d.Arah === 'Masuk' ? 'chip-masuk' : 'chip-keluar'"
                >
                  {{ d.Arah }}
                </span>
                <span v-else class="font-weight-bold">Stok Awal</span>
              </td>
              <td class="tr">{{ fmtNum(d.StokIn) }}</td>
              <td class="tr">{{ fmtNum(d.StokOut) }}</td>
              <td class="tr">{{ fmtNum(d.StokAkhir) }}</td>
            </tr>
            <tr v-if="!detailData[item.RowKey]?.length">
              <td colspan="8" class="empty-row">Tidak ada transaksi.</td>
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
.ck-lbl {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #444;
  cursor: pointer;
  white-space: nowrap;
}
.ck-lbl input[type="checkbox"] {
  accent-color: #1565c0;
  width: 14px;
  height: 14px;
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
.arah-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.chip-masuk {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-keluar {
  background: #ffebee;
  color: #c62828;
}
</style>
