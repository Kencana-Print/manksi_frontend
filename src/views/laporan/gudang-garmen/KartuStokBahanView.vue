<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { kartuStokBahanService } from "@/services/laporan/gudang-garmen/kartuStokBahanService";
import {
  IconClipboardList,
  IconFileSpreadsheet,
  IconSearch,
} from "@tabler/icons-vue";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

import BahanSearchModal from "@/components/lookups/BahanSearchModal.vue";

const toast = useToast();
const menuId = "502";

const today = new Date();
const firstDayOfYear = new Date(today.getFullYear(), 0, 1)
  .toISOString()
  .substring(0, 10);
const todayString = today.toISOString().substring(0, 10);

const filters = ref({
  startDate: firstDayOfYear,
  endDate: todayString,
  kodeBahan: "",
});

const masterHeaders = [
  { title: "Kode", key: "Kode", width: "110px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Satuan", key: "Satuan", width: "80px", align: "center" },
  { title: "Gramasi", key: "Gramasi", width: "90px" },
  { title: "Harga Beli", key: "HargaBeli", width: "110px", align: "end" },
  { title: "Stok Awal", key: "StokAwal", width: "100px", align: "end" },
  { title: "BPB Bahan", key: "BpbBahan", width: "100px", align: "end" },
  {
    title: "Retur Material",
    key: "ReturMaterial",
    width: "110px",
    align: "end",
  },
  { title: "Koreksi", key: "Koreksi", width: "90px", align: "end" },
  {
    title: "Realisasi Permintaan",
    key: "RealisasiPermintaan",
    width: "140px",
    align: "end",
  },
  { title: "Retur Beli", key: "ReturBeli", width: "100px", align: "end" },
  { title: "Stok Akhir", key: "StokAkhir", width: "110px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await kartuStokBahanService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.kodeBahan,
    );
    return res.data.data;
  },
  immediate: true,
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.kodeBahan,
  ],
  fetchData,
);

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
      const res = await kartuStokBahanService.getDetail(
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

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 16 },
      { header: "Nama", key: "Nama", width: 32 },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      { header: "Gramasi", key: "Gramasi", width: 12 },
      {
        header: "Harga Beli",
        key: "HargaBeli",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Stok Awal",
        key: "StokAwal",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "BPB Bahan",
        key: "BpbBahan",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Retur Material",
        key: "ReturMaterial",
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
        header: "Realisasi Permintaan",
        key: "RealisasiPermintaan",
        width: 16,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Retur Beli",
        key: "ReturBeli",
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
      `Kartu_Stok_Bahan_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "Kartu Stok Bahan",
      columns,
      items.value,
      "KARTU STOK BAHAN (MASTER)",
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Export detail (semua bahan sesuai filter, digabung) ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await kartuStokBahanService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.kodeBahan,
    );
    const allDetail: any[] = res.data.data || [];
    if (!allDetail.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }

    // ✅ Kelompokkan per Kode bahan (jaga urutan kemunculan pertama)
    const groups: Record<string, any[]> = {};
    const order: string[] = [];
    allDetail.forEach((r) => {
      const key = r.Kode;
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(r);
    });

    const combinedRows: any[] = [];

    order.forEach((key) => {
      const rowsInGroup = groups[key];
      const first = rowsInGroup[0];
      const masterCells = {
        Kode: first.Kode,
        Nama: first.Nama,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      rowsInGroup.forEach((r, idx) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          Transaksi: r.Transaksi,
          Nomor: r.Nomor,
          Tanggal: formatTanggal(r.Tanggal),
          StokIn: Number(r.StokIn) || 0,
          StokOut: Number(r.StokOut) || 0,
        });
      });
    });

    const columns: ExcelColumn[] = [
      { header: "Kode", key: "Kode", width: 16 },
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

    await exportExcelSingle(
      `Kartu_Stok_Bahan_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "Rincian Transaksi",
      columns,
      combinedRows,
      `Rincian Transaksi Kartu Stok Bahan  |  Periode: ${formatTanggal(filters.value.startDate)} s.d ${formatTanggal(filters.value.endDate)}`,
    );

    toast.success("Berhasil export detail.");
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

const showBahanModal = ref(false);
const namaBahanTerpilih = ref("");

const onBahanSelected = (item: any) => {
  filters.value.kodeBahan = item.Kode;
  namaBahanTerpilih.value = item.Nama || "";
};

const clearBahanFilter = () => {
  filters.value.kodeBahan = "";
  namaBahanTerpilih.value = "";
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Kartu Stok Bahan"
    :menu-id="menuId"
    :icon="IconClipboardList"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Kode"
    :is-loading="isLoading"
    :can-export="canExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @export="onExportMaster"
  >
    <template #extra-actions>
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

    <template #filter-left>
      <span class="f-label">Periode</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">s/d</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <span class="f-label">Kode Bahan</span>
      <div class="bahan-picker">
        <input
          type="text"
          :value="filters.kodeBahan"
          readonly
          class="f-inp"
          placeholder="Kosong = Semua"
          style="width: 100px; cursor: pointer"
          @click="showBahanModal = true"
        />
        <input
          type="text"
          :value="namaBahanTerpilih"
          readonly
          class="f-inp f-ro"
          placeholder="Nama bahan..."
          style="width: 200px"
        />
        <button
          type="button"
          class="btn-lkp"
          title="Cari Bahan"
          @click="showBahanModal = true"
        >
          <IconSearch :size="13" color="#1565c0" />
        </button>
        <button
          v-if="filters.kodeBahan"
          type="button"
          class="btn-clear"
          title="Hapus filter"
          @click="clearBahanFilter"
        >
          ✕
        </button>
      </div>
    </template>

    <template #item.HargaBeli="{ item }">{{ fmtNum(item.HargaBeli) }}</template>
    <template #item.StokAwal="{ item }">{{ fmtNum(item.StokAwal) }}</template>
    <template #item.BpbBahan="{ item }">{{ fmtNum(item.BpbBahan) }}</template>
    <template #item.ReturMaterial="{ item }">{{
      fmtNum(item.ReturMaterial)
    }}</template>
    <template #item.Koreksi="{ item }">{{ fmtNum(item.Koreksi) }}</template>
    <template #item.RealisasiPermintaan="{ item }">{{
      fmtNum(item.RealisasiPermintaan)
    }}</template>
    <template #item.ReturBeli="{ item }">{{ fmtNum(item.ReturBeli) }}</template>
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
              <td class="tc">{{ formatTanggal(d.Tanggal) }}</td>
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

  <BahanSearchModal v-model="showBahanModal" @selected="onBahanSelected" />
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

.bahan-picker {
  display: flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
  background: white;
}
.bahan-picker .f-inp {
  border: none;
  border-radius: 0;
  height: 100%;
}
.bahan-picker .f-inp + .f-inp {
  border-left: 1px solid #eee;
}
.f-ro {
  background: #f5f5f5;
  color: #555;
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
.btn-clear {
  width: 24px;
  min-width: 24px;
  height: 100%;
  background: #ffebee;
  color: #c62828;
  border: none;
  border-left: 1px solid #ccc;
  cursor: pointer;
  font-size: 11px;
  font-weight: 700;
}
.btn-clear:hover {
  background: #ffcdd2;
}
</style>
