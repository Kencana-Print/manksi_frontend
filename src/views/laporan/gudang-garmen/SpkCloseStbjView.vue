<script setup lang="ts">
import { ref, watch, computed, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkCloseStbjService } from "@/services/laporan/gudang-garmen/spkCloseStbjService";
import { IconCircleCheck, IconFileSpreadsheet } from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const menuId = "523";

const today = new Date();

const filters = ref({
  bulan: today.getMonth() + 1,
  tahun: today.getFullYear(),
});

const bulanOptions = [
  { value: 0, label: "Semua" },
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

const isSemuaBulan = computed(() => filters.value.bulan === 0);

const masterHeaders = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Last STBJ", key: "LastStbj", width: "100px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "280px" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "end" },
  { title: "Jml Jadi", key: "JmlJadi", width: "90px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await spkCloseStbjService.getBrowse(
      filters.value.bulan,
      filters.value.tahun,
    );
    return res.data.data;
  },
  immediate: true,
});

watch([() => filters.value.bulan, () => filters.value.tahun], fetchData);

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
      const res = await spkCloseStbjService.getDetail(nomor);
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
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Last STBJ", key: "LastStbj", width: 12, align: "center" },
      { header: "Nama", key: "Nama", width: 32 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Jml Jadi",
        key: "JmlJadi",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcelSingle(
      `SPK_Close_STBJ_${filters.value.bulan}_${filters.value.tahun}.xlsx`,
      "SPK Close STBJ",
      columns,
      items.value,
      "LAPORAN SPK CLOSE STBJ",
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
    const res = await spkCloseStbjService.getAllDetail(
      filters.value.bulan,
      filters.value.tahun,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Nama", key: "Nama", width: 30 },
      { header: "Nomor", key: "Nomor", width: 16 },
      {
        header: "Tanggal STBJ",
        key: "TanggalStbj",
        width: 14,
        align: "center",
      },
      {
        header: "Jml Jadi",
        key: "JmlJadi",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcel(
      `SPK_Close_STBJ_Detail_${filters.value.bulan}_${filters.value.tahun}.xlsx`,
      [
        {
          sheetName: "Detail STBJ",
          columns,
          rows,
          title: "RINCIAN SPK CLOSE STBJ",
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
    title="SPK Close STBJ"
    :menu-id="menuId"
    :icon="IconCircleCheck"
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
      <span class="f-label">Bulan</span>
      <select v-model.number="filters.bulan" class="f-sel">
        <option v-for="b in bulanOptions" :key="b.value" :value="b.value">
          {{ b.label }}
        </option>
      </select>

      <div class="f-divider" />

      <span class="f-label">Tahun</span>
      <input
        type="number"
        v-model.number="filters.tahun"
        class="f-inp-num"
        placeholder="2026"
      />

      <span v-if="isSemuaBulan" class="warn-hint">
        ⚠ Opsi "Semua" akan selalu menghasilkan data kosong (perilaku laporan
        asli)
      </span>
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
    <template #item.LastStbj="{ item }">{{ fmtDate(item.LastStbj) }}</template>
    <template #item.Jumlah="{ item }">{{ fmtNum(item.Jumlah) }}</template>
    <template #item.JmlJadi="{ item }">{{ fmtNum(item.JmlJadi) }}</template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 130px">Tanggal STBJ</th>
              <th style="width: 100px" class="tr">Jml Jadi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailData[item.Nomor]" :key="i">
              <td class="font-weight-bold text-primary">
                {{ fmtDate(d.TanggalStbj) }}
              </td>
              <td class="tr">{{ fmtNum(d.JmlJadi) }}</td>
            </tr>
            <tr v-if="!detailData[item.Nomor]?.length">
              <td colspan="2" class="empty-row">Tidak ada rincian STBJ.</td>
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
.f-inp-num {
  height: 28px;
  width: 80px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.f-inp-num:focus {
  border-color: #1976d2;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 12px;
  display: inline-block;
}
.warn-hint {
  font-size: 11px;
  color: #e65100;
  margin-left: 12px;
  font-style: italic;
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
  max-width: 400px;
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
