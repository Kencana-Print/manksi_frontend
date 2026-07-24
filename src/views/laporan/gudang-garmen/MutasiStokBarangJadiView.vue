<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mutasiStokBarangJadiService } from "@/services/laporan/gudang-garmen/mutasiStokBarangJadiService";
import GudangJadiSearchModal from "@/components/lookups/GudangJadiSearchModal.vue";
import {
  IconArrowsExchange,
  IconFileSpreadsheet,
  IconSearch,
} from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const menuId = "508";

const defaultStart = "2021-01-07";
const todayString = new Date().toISOString().substring(0, 10);

const filters = ref({
  startDate: defaultStart,
  endDate: todayString,
  gudang: "",
  namaGudang: "",
  tampilkanKosong: false,
});

const masterHeaders = [
  { title: "Kode", key: "Kode", width: "150px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Ukuran", key: "Ukuran", width: "130px" },
  { title: "Stok Awal", key: "StokAwal", width: "100px", align: "end" },
  { title: "STBJ", key: "Stbj", width: "90px", align: "end" },
  { title: "Mutasi Masuk", key: "MutasiMasuk", width: "110px", align: "end" },
  { title: "Koreksi", key: "Koreksi", width: "90px", align: "end" },
  { title: "Surat Jalan", key: "SuratJalan", width: "100px", align: "end" },
  {
    title: "Mutasi Keluar",
    key: "MutasiKeluar",
    width: "110px",
    align: "end",
  },
  { title: "Stok Akhir", key: "StokAkhir", width: "110px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await mutasiStokBarangJadiService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.gudang,
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
    () => filters.value.gudang,
    () => filters.value.tampilkanKosong,
  ],
  fetchData,
);

// ── Lookup Gudang ──
const showGudangModal = ref(false);
const onGudangSelected = (item: any) => {
  filters.value.gudang = item.Kode;
  filters.value.namaGudang = item.Nama;
};

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
      const res = await mutasiStokBarangJadiService.getDetail(
        kode,
        filters.value.startDate,
        filters.value.endDate,
        filters.value.gudang,
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

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 18 },
      { header: "Nama", key: "Nama", width: 34 },
      { header: "Ukuran", key: "Ukuran", width: 16 },
      {
        header: "Stok Awal",
        key: "StokAwal",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "STBJ",
        key: "Stbj",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Mutasi Masuk",
        key: "MutasiMasuk",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Koreksi",
        key: "Koreksi",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Surat Jalan",
        key: "SuratJalan",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Mutasi Keluar",
        key: "MutasiKeluar",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Stok Akhir",
        key: "StokAkhir",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcelSingle(
      `Mutasi_Stok_Barang_Jadi_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "Mutasi Stok Barang Jadi",
      columns,
      items.value,
      "LAPORAN MUTASI STOK BARANG JADI (MASTER)",
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
    const res = await mutasiStokBarangJadiService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.gudang,
      filters.value.tampilkanKosong,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 18 },
      { header: "Nama", key: "Nama", width: 30 },
      { header: "Transaksi", key: "Transaksi", width: 20 },
      { header: "Nomor", key: "Nomor", width: 20 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      {
        header: "Stok In",
        key: "StokIn",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Stok Out",
        key: "StokOut",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
    ];
    await exportExcel(
      `Mutasi_Stok_Barang_Jadi_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Rincian Transaksi",
          columns,
          rows,
          title: "RINCIAN TRANSAKSI MUTASI STOK BARANG JADI",
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
    title="Mutasi Stok Barang Jadi"
    :menu-id="menuId"
    :icon="IconArrowsExchange"
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
      <span class="f-label">Filter Periode</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <span class="f-label">Gudang</span>
      <div class="picker">
        <input
          type="text"
          :value="filters.gudang"
          readonly
          class="f-inp"
          style="width: 80px; cursor: pointer"
          placeholder="Kode"
          @click="showGudangModal = true"
        />
        <input
          type="text"
          :value="filters.namaGudang"
          readonly
          class="f-inp f-ro"
          placeholder="Nama gudang..."
          style="width: 200px"
        />
        <button type="button" class="btn-lkp" @click="showGudangModal = true">
          <IconSearch :size="13" color="#1565c0" />
        </button>
      </div>

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

    <template #item.StokAwal="{ item }">{{ fmtNum(item.StokAwal) }}</template>
    <template #item.Stbj="{ item }">{{ fmtNum(item.Stbj) }}</template>
    <template #item.MutasiMasuk="{ item }">{{
      fmtNum(item.MutasiMasuk)
    }}</template>
    <template #item.Koreksi="{ item }">{{ fmtNum(item.Koreksi) }}</template>
    <template #item.SuratJalan="{ item }">{{
      fmtNum(item.SuratJalan)
    }}</template>
    <template #item.MutasiKeluar="{ item }">{{
      fmtNum(item.MutasiKeluar)
    }}</template>
    <template #item.StokAkhir="{ item }">
      <span
        :class="{ 'text-error font-weight-bold': Number(item.StokAkhir) < 0 }"
      >
        {{ fmtNum(item.StokAkhir) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Kode]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat transaksi...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 140px">Transaksi</th>
              <th style="width: 160px">Nomor</th>
              <th style="width: 100px" class="tc">Tanggal</th>
              <th style="width: 110px" class="tr">Stok In</th>
              <th style="width: 110px" class="tr">Stok Out</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailData[item.Kode]" :key="i">
              <td :class="{ 'font-weight-bold': d.Transaksi === 'Stok Awal' }">
                {{ d.Transaksi }}
              </td>
              <td>{{ d.Nomor || "-" }}</td>
              <td class="tc">
                {{ formatTanggal(d.Tanggal) }}
              </td>
              <td class="tr">{{ fmtNum(d.StokIn) }}</td>
              <td class="tr">{{ fmtNum(d.StokOut) }}</td>
            </tr>
            <tr v-if="!detailData[item.Kode]?.length">
              <td colspan="5" class="empty-row">Tidak ada transaksi.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <GudangJadiSearchModal
    v-model="showGudangModal"
    @selected="onGudangSelected"
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
.f-inp {
  height: 28px;
  border: none;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.f-ro {
  background: #f5f5f5;
  color: #555;
}
.picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
}
.picker .f-inp + .f-inp {
  border-left: 1px solid #eee;
}
.btn-lkp {
  width: 26px;
  min-width: 26px;
  height: 100%;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #ccc;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-lkp:hover {
  background: #bbdefb;
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
</style>
