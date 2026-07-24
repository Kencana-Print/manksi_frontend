<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { spkVsStbjVsSjService } from "@/services/laporan/gudang-garmen/spkVsStbjVsSjService";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";
import PerusahaanSearchModal from "@/components/lookups/PerusahaanSearchModal.vue";
import {
  IconTruckLoading,
  IconFileSpreadsheet,
  IconSearch,
} from "@tabler/icons-vue";
import { exportExcel, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const menuId = "518";

const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const today = new Date();

const filters = ref({
  startDate: toLocalDateStr(today),
  endDate: toLocalDateStr(today),
  spk: "",
  perusahaan: "",
  status: "ALL",
  divisi: "ALL",
  isMap: false,
});
const namaSpkTerpilih = ref("");
const namaPerushTerpilih = ref("");
const showSpkModal = ref(false);
const showPerushModal = ref(false);

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

const onPerushSelected = (item: any) => {
  filters.value.perusahaan = item.perush_kode;
  namaPerushTerpilih.value = item.perush_nama || "";
  fetchData();
};
const clearPerush = () => {
  filters.value.perusahaan = "";
  namaPerushTerpilih.value = "";
  fetchData();
};

// ── Divisi dropdown dinamis ──
const divisiOptions = ref<{ kode: string; nama: string }[]>([]);
const fetchDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = res.data.data || [];
  } catch {
    divisiOptions.value = [];
  }
};

const masterHeaders = [
  { title: "Divisi", key: "Divisi", width: "90px" },
  { title: "Tanggal", key: "Tanggal", width: "95px", align: "center" },
  { title: "Dateline", key: "Dateline", width: "95px", align: "center" },
  { title: "Nama", key: "Nama", minWidth: "200px" },
  { title: "P", key: "Panjang", width: "60px", align: "end" },
  { title: "L", key: "Lebar", width: "60px", align: "end" },
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Customer", key: "Customer", minWidth: "160px" },
  { title: "Jenis", key: "Jenis", width: "70px" },
  { title: "Kain", key: "Kain", width: "120px" },
  { title: "Jml Order", key: "JmlOrder", width: "90px", align: "end" },
  { title: "Jadi", key: "Jadi", width: "90px", align: "end" },
  { title: "Jadi P1", key: "JadiP1", width: "85px", align: "end" },
  { title: "Jadi P4", key: "JadiP4", width: "85px", align: "end" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "end" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await spkVsStbjVsSjService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.spk,
      filters.value.perusahaan,
      filters.value.status,
      filters.value.divisi,
      filters.value.isMap,
    );
    return res.data.data;
  },
  immediate: true,
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.status,
    () => filters.value.divisi,
    () => filters.value.isMap,
  ],
  fetchData,
);

// ── Master-detail (row expand) — 2 dataset: STBJ & SJ ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, { stbj: any[]; sj: any[] }>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  for (const v of val) {
    const nomor = typeof v === "object" ? v.Nomor : v;
    if (!nomor || detailData.value[nomor]) continue;
    detailLoading.value[nomor] = true;
    try {
      const res = await spkVsStbjVsSjService.getDetail(nomor);
      detailData.value[nomor] = res.data.data || { stbj: [], sj: [] };
    } catch {
      detailData.value[nomor] = { stbj: [], sj: [] };
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
  return `${d}/${m}/${y}`;
};

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Divisi", key: "Divisi", width: 12 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Nama", key: "Nama", width: 28 },
      { header: "P", key: "Panjang", width: 8 },
      { header: "L", key: "Lebar", width: 8 },
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Customer", key: "Customer", width: 22 },
      { header: "Jenis", key: "Jenis", width: 10 },
      { header: "Kain", key: "Kain", width: 16 },
      {
        header: "Jml Order",
        key: "JmlOrder",
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
      {
        header: "Jadi P1",
        key: "JadiP1",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Jadi P4",
        key: "JadiP4",
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
    ];
    await exportExcel(
      `SPK_vs_STBJ_vs_SJ_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "SPK vs STBJ vs SJ",
          columns,
          rows: items.value,
          title: "LAPORAN SPK VS STBJ VS SJ",
        },
      ],
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};

// ── Export detail (2 sheet: STBJ & SJ) ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await spkVsStbjVsSjService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.spk,
      filters.value.perusahaan,
      filters.value.status,
      filters.value.divisi,
      filters.value.isMap,
    );
    const { stbj = [], sj = [] } = res.data.data || {};
    if (!stbj.length && !sj.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const stbjColumns: ExcelColumn[] = [
      { header: "Spk", key: "Spk", width: 18 },
      { header: "Nama", key: "Nama", width: 26 },
      { header: "Customer", key: "Customer", width: 22 },
      { header: "Nomor STBJ", key: "NomorStbj", width: 18 },
      { header: "Tgl STBJ", key: "TglStbj", width: 12, align: "center" },
      { header: "Keterangan", key: "Keterangan", width: 26 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Gudang Jadi", key: "GudangJadi", width: 16 },
    ];
    const sjColumns: ExcelColumn[] = [
      { header: "Spk", key: "Spk", width: 18 },
      { header: "Nama", key: "Nama", width: 26 },
      { header: "Customer", key: "Customer", width: 22 },
      { header: "Nomor SJ", key: "NomorSj", width: 18 },
      { header: "Tgl SJ", key: "TglSj", width: 12, align: "center" },
      { header: "Gudang", key: "Gudang", width: 16 },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Alamat", key: "Alamat", width: 28 },
      { header: "Kota", key: "Kota", width: 16 },
    ];
    await exportExcel(
      `SPK_vs_STBJ_vs_SJ_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Detail STBJ",
          columns: stbjColumns,
          rows: stbj,
          title: "RINCIAN STBJ",
        },
        {
          sheetName: "Detail SJ",
          columns: sjColumns,
          rows: sj,
          title: "RINCIAN SURAT JALAN",
        },
      ],
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

onMounted(() => {
  fetchDivisi();
  fetchData();
});
</script>

<template>
  <BaseBrowse
    title="SPK vs STBJ vs SJ"
    :menu-id="menuId"
    :icon="IconTruckLoading"
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
      <span class="f-label">Tanggal</span>
      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <label class="f-check">
        <input type="checkbox" v-model="filters.isMap" @change="fetchData" />
        <span>MAP</span>
      </label>

      <div class="f-divider" />

      <span class="f-label">SPK/MAP</span>
      <div class="spk-picker">
        <input
          type="text"
          :value="filters.spk"
          readonly
          class="f-inp"
          style="width: 120px; cursor: pointer"
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

      <span class="f-label">Perusahaan</span>
      <div class="spk-picker">
        <input
          type="text"
          :value="filters.perusahaan"
          readonly
          class="f-inp"
          style="width: 100px; cursor: pointer"
          placeholder="Klik untuk pilih..."
          @click="showPerushModal = true"
        />
        <button
          v-if="filters.perusahaan"
          type="button"
          class="btn-clear-spk"
          @click="clearPerush"
        >
          ✕
        </button>
        <button
          type="button"
          class="btn-search-spk"
          @click="showPerushModal = true"
        >
          <IconSearch :size="13" />
        </button>
      </div>
      <span v-if="namaPerushTerpilih" class="spk-nama-hint">{{
        namaPerushTerpilih
      }}</span>

      <div class="f-divider" />

      <span class="f-label">Status</span>
      <select v-model="filters.status" class="f-sel">
        <option value="ALL">All</option>
        <option value="OUTSTANDING">Belum Kirim Penuh</option>
        <option value="SELESAI">Sudah Kirim Penuh</option>
      </select>

      <div class="f-divider" />

      <span class="f-label">Divisi</span>
      <select v-model="filters.divisi" class="f-sel">
        <option value="ALL">Semua</option>
        <option v-for="d in divisiOptions" :key="d.kode" :value="d.kode">
          {{ d.kode }} - {{ d.nama }}
        </option>
      </select>
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

    <template #item.Panjang="{ item }">{{ item.Panjang || "-" }}</template>
    <template #item.Lebar="{ item }">{{ item.Lebar || "-" }}</template>
    <template #item.JmlOrder="{ item }">{{ fmtNum(item.JmlOrder) }}</template>
    <template #item.Jadi="{ item }">{{ fmtNum(item.Jadi) }}</template>
    <template #item.JadiP1="{ item }">{{
      item.JadiP1 === null ? "-" : fmtNum(item.JadiP1)
    }}</template>
    <template #item.JadiP4="{ item }">{{
      item.JadiP4 === null ? "-" : fmtNum(item.JadiP4)
    }}</template>
    <template #item.Kirim="{ item }">{{ fmtNum(item.Kirim) }}</template>
    <template #item.Tanggal="{ item }">
      {{ item.Tanggal?.replace(/-/g, "/") }}
    </template>

    <template #item.Dateline="{ item }">
      {{ item.Dateline?.replace(/-/g, "/") }}
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat detail...</span>
        </div>
        <template v-else>
          <div class="dtl-section-title">STBJ</div>
          <table class="dtl-table">
            <thead>
              <tr>
                <th style="width: 140px">Nomor STBJ</th>
                <th style="width: 100px">Tgl STBJ</th>
                <th style="min-width: 200px">Keterangan</th>
                <th style="width: 100px" class="tr">Jumlah</th>
                <th style="width: 130px">Gudang Jadi</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailData[item.Nomor]?.stbj" :key="i">
                <td class="font-weight-bold text-primary">{{ d.NomorStbj }}</td>
                <td>{{ fmtDate(d.TglStbj) }}</td>
                <td>{{ d.Keterangan }}</td>
                <td class="tr">{{ fmtNum(d.Jumlah) }}</td>
                <td>{{ d.GudangJadi }}</td>
              </tr>
              <tr v-if="!detailData[item.Nomor]?.stbj?.length">
                <td colspan="5" class="empty-row">Tidak ada data STBJ.</td>
              </tr>
            </tbody>
          </table>

          <div class="dtl-section-title mt-3">Surat Jalan</div>
          <table class="dtl-table">
            <thead>
              <tr>
                <th style="width: 140px">Nomor SJ</th>
                <th style="width: 100px">Tgl SJ</th>
                <th style="width: 130px">Gudang</th>
                <th style="width: 100px" class="tr">Jumlah</th>
                <th style="min-width: 200px">Alamat</th>
                <th style="width: 130px">Kota</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailData[item.Nomor]?.sj" :key="i">
                <td class="font-weight-bold text-primary">{{ d.NomorSj }}</td>
                <td>{{ fmtDate(d.TglSj) }}</td>
                <td>{{ d.Gudang }}</td>
                <td class="tr">{{ fmtNum(d.Jumlah) }}</td>
                <td>{{ d.Alamat }}</td>
                <td>{{ d.Kota }}</td>
              </tr>
              <tr v-if="!detailData[item.Nomor]?.sj?.length">
                <td colspan="6" class="empty-row">
                  Tidak ada data Surat Jalan.
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </template>
  </BaseBrowse>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="all"
    @selected="onSpkSelected"
  />
  <PerusahaanSearchModal
    v-model="showPerushModal"
    @selected="onPerushSelected"
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
.f-check {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #333;
  cursor: pointer;
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
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
.dtl-section-title {
  font-size: 11px;
  font-weight: 700;
  color: #37474f;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border: 1px solid #cfd8dc;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 4px;
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
