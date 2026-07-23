<script setup lang="ts">
import { ref, watch, onMounted, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { pojVsBpjService } from "@/services/laporan/gudang-garmen/pojVsBpjService";
import {
  IconFileInvoice,
  IconFileSpreadsheet,
  IconSearch,
} from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const toast = useToast();
const menuId = "513";

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
  gudang: "",
  spk: "",
});
const namaSpkTerpilih = ref("");
const showSpkModal = ref(false);

const onSpkSelected = (item: any) => {
  filters.value.spk = item.Nomor;
  namaSpkTerpilih.value = item.Nama || item.Nama2 || "";
  fetchData();
};
const clearSpk = () => {
  filters.value.spk = "";
  namaSpkTerpilih.value = "";
  fetchData();
};

const masterHeaders = [
  { title: "Nomor", key: "Nomor", width: "130px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Gudang", key: "Gudang", width: "70px" },
  { title: "Kode", key: "Kode", width: "80px" },
  { title: "Supplier", key: "Supplier", minWidth: "160px" },
  { title: "Jasa", key: "Jasa", width: "110px" },
  { title: "SPK", key: "Spk", width: "130px" },
  { title: "Nama", key: "Nama", minWidth: "180px" },
  { title: "Jml PO", key: "JmlPo", width: "90px", align: "end" },
  { title: "Jml Terima", key: "JmlTerima", width: "90px", align: "end" },
  { title: "Kurang", key: "Kurang", width: "90px", align: "end" },
  { title: "Tarif", key: "Tarif", width: "90px", align: "end" },
  { title: "Tot PO", key: "TotPo", width: "110px", align: "end" },
  { title: "Tot Terima", key: "TotTerima", width: "110px", align: "end" },
  { title: "Tot Kurang", key: "TotKurang", width: "110px", align: "end" },
  { title: "No. BPJ", key: "NomorBpjList", minWidth: "150px" },
  { title: "Tgl BPJ", key: "TanggalBpjList", minWidth: "130px" },
  { title: "Jth Tempo BPJ", key: "JatuhTempoBpjList", minWidth: "130px" },
  {
    title: "Jumlah BPJ",
    key: "JumlahBpjList",
    minWidth: "140px",
    align: "end",
  },
  {
    title: "Total Bayar BPJ",
    key: "TotalBayarBpj",
    width: "130px",
    align: "end",
  },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await pojVsBpjService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.gudang,
      filters.value.spk,
    );
    return res.data.data;
  },
  immediate: true,
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.gudang,
  ],
  fetchData,
);

const fmtNum = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);
const fmtDate = (v: string) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 16 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Gudang", key: "Gudang", width: 10 },
      { header: "Kode", key: "Kode", width: 10 },
      { header: "Supplier", key: "Supplier", width: 24 },
      { header: "Jasa", key: "Jasa", width: 16 },
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
      {
        header: "Tarif",
        key: "Tarif",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Tot PO",
        key: "TotPo",
        width: 15,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Tot Terima",
        key: "TotTerima",
        width: 15,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Tot Kurang",
        key: "TotKurang",
        width: 15,
        align: "right",
        numFmt: "#,##0",
      },
    ];
    await exportExcelSingle(
      `PO_Jasa_vs_BPJ_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "PO Jasa vs BPB Jasa",
      columns,
      items.value,
      "LAPORAN PO JASA VS BPB JASA (MASTER)",
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
    const res = await pojVsBpjService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.gudang,
      filters.value.spk,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data untuk diexport.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Nomor PO", key: "Nomor", width: 16 },
      { header: "Tanggal PO", key: "Tanggal", width: 12, align: "center" },
      { header: "Kode", key: "Kode", width: 10 },
      { header: "Supplier", key: "Supplier", width: 24 },
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
        header: "Terima",
        key: "JmlTerima",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Tot Kurang",
        key: "TotKurang",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Tarif",
        key: "Tarif",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Nomor BPJ", key: "NomorBpj", width: 16 },
      { header: "Tgl BPJ", key: "Tanggal", width: 12, align: "center" },
      { header: "Jth Tempo", key: "JatuhTempo", width: 12, align: "center" },
      {
        header: "Jumlah BPJ",
        key: "Jumlah",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
    ];
    await exportExcel(
      `PO_Jasa_vs_BPJ_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "PO Jasa vs BPB Jasa",
          columns,
          rows,
          title: "LAPORAN PO JASA VS BPB JASA",
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
    title="PO Jasa vs BPB Jasa"
    :menu-id="menuId"
    :icon="IconFileInvoice"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    summary-key="TotKurang"
    summary-label="Total Kurang"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Tanggal PO</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <span class="f-label">Gudang</span>
      <select v-model="filters.gudang" class="f-sel">
        <option value="">Kosong = Semua</option>
        <option value="P01">P01</option>
        <option value="P04">P04</option>
      </select>

      <div class="f-divider" />

      <span class="f-label">SPK</span>
      <div class="spk-picker">
        <input
          type="text"
          :value="filters.spk"
          readonly
          class="f-inp"
          style="width: 130px; cursor: pointer"
          placeholder="Klik untuk pilih..."
          @click="showSpkModal = true"
        />
        <button
          v-if="filters.spk"
          type="button"
          class="btn-clear-spk"
          @click="clearSpk"
        >
          ✕
        </button>
        <button
          type="button"
          class="btn-search-spk"
          @click="showSpkModal = true"
        >
          <IconSearch :size="13" />
        </button>
      </div>
      <span v-if="namaSpkTerpilih" class="spk-nama-hint">{{
        namaSpkTerpilih
      }}</span>
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
    <template #item.JmlPo="{ item }">{{ fmtNum(item.JmlPo) }}</template>
    <template #item.JmlTerima="{ item }">{{ fmtNum(item.JmlTerima) }}</template>
    <template #item.Kurang="{ item }">
      <span :class="{ 'text-error font-weight-bold': Number(item.Kurang) > 0 }">
        {{ fmtNum(item.Kurang) }}
      </span>
    </template>
    <template #item.Tarif="{ item }">{{ fmtNum(item.Tarif) }}</template>
    <template #item.TotPo="{ item }">{{ fmtNum(item.TotPo) }}</template>
    <template #item.TotTerima="{ item }">{{ fmtNum(item.TotTerima) }}</template>
    <template #item.TotKurang="{ item }">
      <span
        :class="{ 'text-error font-weight-bold': Number(item.TotKurang) > 0 }"
      >
        {{ fmtNum(item.TotKurang) }}
      </span>
    </template>
    <template #item.TotalBayarBpj="{ item }">{{
      fmtNum(item.TotalBayarBpj)
    }}</template>
  </BaseBrowse>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-ppic"
    @selected="onSpkSelected"
  />
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
.f-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.f-inp:focus {
  border-color: #1976d2;
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
.chip {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  white-space: nowrap;
  margin-right: 6px;
}
.chip-terima {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-kurang {
  background: #ffebee;
  color: #c62828;
}
.spk-picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
}
.spk-picker .f-inp {
  border: none;
  height: 26px;
}
.btn-clear-spk {
  background: #ffebee;
  border: none;
  color: #c62828;
  font-size: 11px;
  width: 22px;
  height: 26px;
  cursor: pointer;
}
.btn-search-spk {
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  color: #1565c0;
  width: 24px;
  height: 26px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-nama-hint {
  font-size: 11px;
  color: #757575;
  font-style: italic;
  margin-left: 6px;
}
.chip {
  font-size: 11px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 12px;
  white-space: nowrap;
  margin-left: 6px;
}
.chip-terima {
  background: #e8f5e9;
  color: #2e7d32;
}
</style>
