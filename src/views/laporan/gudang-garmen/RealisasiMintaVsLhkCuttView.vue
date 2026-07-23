<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { realisasiMintaVsLhkCuttService } from "@/services/laporan/gudang-garmen/realisasiMintaVsLhkCuttService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import {
  IconClipboardCheck,
  IconFileSpreadsheet,
  IconSearch,
} from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";

const toast = useToast();
const menuId = "568";

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
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "SPK", key: "Spk", width: "140px" },
  { title: "Nama SPK", key: "NamaSpk", minWidth: "200px" },
  { title: "Tujuan", key: "Tujuan", width: "100px" },
  { title: "Kode", key: "Kode", width: "110px" },
  { title: "Nama Bahan", key: "NamaBahan", minWidth: "200px" },
  { title: "Satuan", key: "Satuan", width: "70px" },
  { title: "Minta", key: "JmlMinta", width: "90px", align: "end" },
  { title: "Retur", key: "JmlRetur", width: "90px", align: "end" },
  { title: "Net Minta", key: "NetMinta", width: "90px", align: "end" },
  { title: "Lhk", key: "JmlLhk", width: "90px", align: "end" },
  { title: "Cmt", key: "JmlCmt", width: "90px", align: "end" },
  { title: "Tot Potong", key: "TotalPotong", width: "100px", align: "end" },
  { title: "Sisa", key: "Sisa", width: "90px", align: "end" },
  { title: "Status", key: "Status", width: "80px", align: "center" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await realisasiMintaVsLhkCuttService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.cab,
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
    () => filters.value.cab,
  ],
  fetchData,
);

// ── Pewarnaan baris — replikasi persis cxGrdMasterCustomDrawCell:
// baris merah kalau Status = OPEN
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item?.Status === "OPEN") {
    return { style: "color:#c62828; font-weight:600" };
  }
  return {};
};

// ── Master-detail (row expand) — dikunci pakai Id, BUKAN Nomor ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const id = typeof v === "object" ? v.Id : v;
    if (!id || detailData.value[id]) continue;
    detailLoading.value[id] = true;
    try {
      const res = await realisasiMintaVsLhkCuttService.getDetail(id);
      detailData.value[id] = res.data.data || [];
    } catch {
      detailData.value[id] = [];
    } finally {
      detailLoading.value[id] = false;
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

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "SPK", key: "Spk", width: 18 },
      { header: "Nama SPK", key: "NamaSpk", width: 26 },
      { header: "Tujuan", key: "Tujuan", width: 12 },
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Nama Bahan", key: "NamaBahan", width: 24 },
      { header: "Satuan", key: "Satuan", width: 10 },
      {
        header: "Minta",
        key: "JmlMinta",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Retur",
        key: "JmlRetur",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Lhk",
        key: "JmlLhk",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Cmt",
        key: "JmlCmt",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Total Potong",
        key: "TotalPotong",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Sisa",
        key: "Sisa",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Status", key: "Status", width: 10, align: "center" },
    ];
    await exportExcelSingle(
      `Realisasi_Minta_vs_LHK_Cutting_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "Realisasi vs LHK Cutting",
      columns,
      items.value,
      "LAPORAN REALISASI MINTA BAHAN VS LHK CUTTING",
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
    const res = await realisasiMintaVsLhkCuttService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.cab,
      filters.value.spk,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "SPK", key: "Spk", width: 18 },
      { header: "Nama SPK", key: "NamaSpk", width: 26 },
      { header: "Tujuan", key: "Tujuan", width: 12 },
      { header: "Kode", key: "Kode", width: 14 },
      { header: "Nama Bahan", key: "NamaBahan", width: 24 },
      { header: "No Mutasi", key: "NoMutasi", width: 16 },
      { header: "Tgl Mutasi", key: "TglMutasi", width: 12, align: "center" },
      { header: "Gudang", key: "Gudang", width: 14 },
      {
        header: "Jml Potong",
        key: "JumlahPotong",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Berat",
        key: "Berat",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Satuan", key: "Satuan", width: 10 },
      {
        header: "Babaran",
        key: "Babaran",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Approve", key: "Approve", width: 10, align: "center" },
    ];
    await exportExcel(
      `Realisasi_Minta_vs_LHK_Cutting_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Detail Mutasi",
          columns,
          rows,
          title: "RINCIAN REALISASI MINTA BAHAN VS LHK CUTTING",
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
    title="Realisasi Minta Bahan vs LHK Cutting"
    :menu-id="menuId"
    :icon="IconClipboardCheck"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Id"
    :is-loading="isLoading"
    show-expand
    :expanded="expandedRows"
    :row-props-fn="rowPropsFn"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Tgl Permintaan</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <span class="f-label">Tujuan</span>
      <select v-model="filters.cab" class="f-sel">
        <option value="ALL">ALL</option>
        <option value="P01">P01</option>
        <option value="P04">P04</option>
      </select>

      <div class="f-divider" />

      <span class="f-label">SPK/MAP</span>
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

      <div class="f-divider" />

      <div class="legend"><span class="dot dot-red" /> = Status OPEN</div>
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
    <template #item.JmlMinta="{ item }">{{ fmtNum(item.JmlMinta) }}</template>
    <template #item.JmlRetur="{ item }">{{ fmtNum(item.JmlRetur) }}</template>
    <template #item.NetMinta="{ item }">{{
      fmtNum(Number(item.JmlMinta || 0) - Number(item.JmlRetur || 0))
    }}</template>
    <template #item.JmlLhk="{ item }">{{ fmtNum(item.JmlLhk) }}</template>
    <template #item.JmlCmt="{ item }">{{ fmtNum(item.JmlCmt) }}</template>
    <template #item.TotalPotong="{ item }">{{
      fmtNum(item.TotalPotong)
    }}</template>
    <template #item.Sisa="{ item }">{{ fmtNum(item.Sisa) }}</template>
    <template #item.Status="{ item }">
      <span :class="item.Status === 'OPEN' ? 'badge-open' : 'badge-close'">{{
        item.Status
      }}</span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Id]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey"
            >Memuat detail mutasi...</span
          >
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 130px">No Mutasi</th>
              <th style="width: 95px">Tgl Mutasi</th>
              <th style="width: 110px">Gudang</th>
              <th style="min-width: 180px">Nama Bahan</th>
              <th style="width: 90px" class="tr">Jml Potong</th>
              <th style="width: 90px" class="tr">Berat</th>
              <th style="width: 70px">Satuan</th>
              <th style="width: 80px" class="tr">Babaran</th>
              <th style="width: 70px" class="tc">Approve</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(d, i) in detailData[item.Id]"
              :key="i"
              :class="{ 'row-not-approved': d.Approve === 'N' }"
            >
              <td class="font-weight-bold text-primary">{{ d.NoMutasi }}</td>
              <td>{{ fmtDate(d.TglMutasi) }}</td>
              <td>{{ d.Gudang }}</td>
              <td>{{ d.NamaBahan }}</td>
              <td class="tr">{{ fmtNum(d.JumlahPotong) }}</td>
              <td class="tr">{{ fmtNum(d.Berat) }}</td>
              <td>{{ d.Satuan }}</td>
              <td class="tr">{{ fmtNum(d.Babaran, 4) }}</td>
              <td class="tc">{{ d.Approve || "-" }}</td>
            </tr>
            <tr v-if="!detailData[item.Id]?.length">
              <td colspan="9" class="empty-row">Tidak ada rincian mutasi.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="all"
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
  border: none;
  padding: 0 8px;
  font-size: 12px;
  outline: none;
}
.spk-picker {
  display: inline-flex;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
  height: 28px;
}
.btn-clear-spk {
  background: #ffebee;
  border: none;
  border-left: 1px solid #ccc;
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
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.legend {
  display: flex;
  align-items: center;
  gap: 6px;
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
.badge-open {
  color: #c62828;
  font-weight: 700;
}
.badge-close {
  color: #2e7d32;
  font-weight: 700;
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
.row-not-approved td {
  color: #c62828;
  font-weight: 600;
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
