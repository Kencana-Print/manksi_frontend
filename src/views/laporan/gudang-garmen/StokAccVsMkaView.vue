<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { stokAccVsMkaService } from "@/services/laporan/gudang-garmen/stokAccVsMkaService";
import { IconScale, IconFileSpreadsheet } from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const menuId = "569";

// Default sesuai Delphi FormShow: tanggal awal hardcode 25/09/2025,
// bukan hasil kalkulasi (awal bulan/tahun).
const defaultStart = "2025-09-25";
const todayString = new Date().toISOString().substring(0, 10);

const filters = ref({
  startDate: defaultStart,
  endDate: todayString,
});

const masterHeaders = [
  { title: "Kode", key: "Kode", width: "140px" },
  { title: "Nama", key: "Nama", minWidth: "260px" },
  { title: "Satuan", key: "Satuan", width: "90px", align: "center" },
  { title: "Stok Acc", key: "StokAcc", width: "110px", align: "end" },
  { title: "MKA", key: "Mka", width: "100px", align: "end" },
  { title: "Free", key: "Free", width: "110px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await stokAccVsMkaService.getBrowse(
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
  const kodeList = val.map((v) => (typeof v === "object" ? v.Kode : v));
  for (const kode of kodeList.filter((k) => k && !detailData.value[k])) {
    detailLoading.value[kode] = true;
    try {
      const res = await stokAccVsMkaService.getDetail(
        kode,
        filters.value.startDate,
        filters.value.endDate,
      );
      detailData.value[kode] = res.data.data || [];
    } catch {
      detailData.value[kode] = [];
    } finally {
      detailLoading.value[kode] = false;
    }
  }
};

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);
const fmtDate = (v: string) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 18 },
      { header: "Nama", key: "Nama", width: 36 },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      {
        header: "Stok Acc",
        key: "StokAcc",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "MKA",
        key: "Mka",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Free",
        key: "Free",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcelSingle(
      `Stok_Acc_vs_MKA_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "Stok Acc vs MKA",
      columns,
      items.value,
      "LAPORAN STOK ACCESORIES VS MKA (MASTER)",
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
    const res = await stokAccVsMkaService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada periode ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 18 },
      { header: "Nama Barang", key: "NamaBarang", width: 30 },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      { header: "Nomor MKA", key: "NomorMKA", width: 20 },
      { header: "Tgl MKA", key: "TglMKA", width: 14, align: "center" },
      { header: "No. SPK", key: "Spk", width: 20 },
      { header: "Nama SPK", key: "Nama", width: 30 },
      {
        header: "MKA",
        key: "Mka",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Realisasi",
        key: "Realisasi",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcel(
      `Stok_Acc_vs_MKA_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Rincian MKA",
          columns,
          rows,
          title: "RINCIAN MKA BELUM TERREALISASI",
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
    title="Stok Accesories vs MKA"
    :menu-id="menuId"
    :icon="IconScale"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Kode"
    :is-loading="isLoading"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Tgl MKA</span>
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

    <template #item.StokAcc="{ item }">{{ fmtNum(item.StokAcc) }}</template>
    <template #item.Mka="{ item }">{{ fmtNum(item.Mka) }}</template>
    <template #item.Free="{ item }">
      <span :class="{ 'text-error font-weight-bold': Number(item.Free) < 0 }">
        {{ fmtNum(item.Free) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Kode]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat data MKA...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 150px">Nomor MKA</th>
              <th style="width: 100px" class="tc">Tgl MKA</th>
              <th style="width: 150px">No. SPK</th>
              <th style="min-width: 250px">Nama SPK</th>
              <th style="width: 100px" class="tr">MKA</th>
              <th style="width: 100px" class="tr">Realisasi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailData[item.Kode]" :key="i">
              <td class="font-weight-bold text-primary">{{ d.NomorMKA }}</td>
              <td class="tc">{{ fmtDate(d.TglMKA) }}</td>
              <td>{{ d.Spk }}</td>
              <td>{{ d.Nama }}</td>
              <td class="tr">{{ fmtNum(d.Mka) }}</td>
              <td class="tr">{{ fmtNum(d.Realisasi) }}</td>
            </tr>
            <tr v-if="!detailData[item.Kode]?.length">
              <td colspan="6" class="empty-row">
                Tidak ada MKA belum terrealisasi.
              </td>
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
