<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { standartBabaranVsRealisasiService } from "@/services/laporan/gudang-garmen/standartBabaranVsRealisasiService";
import { IconScale, IconFileSpreadsheet } from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
} from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const menuId = "509";

const todayString = new Date().toISOString().substring(0, 10);

const filters = ref({
  startDate: todayString,
  endDate: todayString,
  cabang: "ALL",
  mode: "spk", // "spk" = Tanggal SPK, "lhk" = Tanggal LHK
});

const masterHeaders = [
  { title: "Nomor", key: "Nomor", width: "140px" },
  { title: "Tgl SPK", key: "TanggalSpk", width: "95px" },
  { title: "Dateline", key: "Dateline", width: "95px" },
  { title: "Kode Cus", key: "KodeCustomer", width: "90px" },
  { title: "Customer", key: "Customer", minWidth: "200px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Jml SPK", key: "SpkJumlah", width: "90px", align: "end" },
  { title: "Jml Jadi", key: "SpkJumlahJadi", width: "90px", align: "end" },
  { title: "Ukuran", key: "Ukuran", width: "130px" },
  { title: "Tipe", key: "Tipe", width: "90px" },
  { title: "Panjang", key: "Panjang", width: "80px", align: "end" },
  { title: "Lebar", key: "Lebar", width: "80px", align: "end" },
  { title: "Gramasi", key: "Gramasi", width: "110px" },
  { title: "Kain", key: "Kain", width: "140px" },
  { title: "Finishing", key: "Finishing", width: "110px" },
  { title: "Status", key: "Status", width: "90px" },
  { title: "Minus", key: "Minus", width: "90px", align: "end" },
];

const detailHeaders = [
  { title: "Komponen", key: "Komponen", width: "110px" },
  {
    title: "Babaran Std",
    key: "BabaranStandar",
    width: "100px",
    align: "end",
  },
  {
    title: "Babaran Real.",
    key: "BabaranRealisasi",
    width: "100px",
    align: "end",
  },
  { title: "Selisih", key: "Selisih", width: "90px", align: "end" },
  { title: "Selisih %", key: "SelisihPersen", width: "90px", align: "end" },
  { title: "Jml MKB", key: "JumlahMKB", width: "90px", align: "end" },
  { title: "Jml LHK", key: "JumlahLHK", width: "90px", align: "end" },
  { title: "Terpakai", key: "Terpakai", width: "90px", align: "end" },
  { title: "Alasan", key: "Alasan", minWidth: "180px" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await standartBabaranVsRealisasiService.getBrowse(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.cabang,
      filters.value.mode,
    );
    return res.data.data;
  },
  immediate: true,
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.cabang,
    () => filters.value.mode,
  ],
  fetchData,
);

// ── Master-detail (row expand) ──
const expandedRows = ref<any[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  const nomorList = val.map((v) => (typeof v === "object" ? v.Nomor : v));
  for (const nomor of nomorList.filter((n) => n && !detailData.value[n])) {
    detailLoading.value[nomor] = true;
    try {
      const res = await standartBabaranVsRealisasiService.getDetail(
        nomor,
        filters.value.startDate,
        filters.value.endDate,
        filters.value.cabang,
        filters.value.mode,
      );
      detailData.value[nomor] = res.data.data || [];
    } catch {
      detailData.value[nomor] = [];
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

const fmtNum = (val: any, decimals = 0) =>
  Number(val || 0).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

// ── Export master ──
const isExporting = ref(false);
const onExportMaster = async () => {
  if (!items.value?.length) return;
  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 18 },
      { header: "Tgl SPK", key: "TanggalSpk", width: 12, align: "center" },
      { header: "Dateline", key: "Dateline", width: 12, align: "center" },
      { header: "Kode Cus", key: "KodeCustomer", width: 12 },
      { header: "Customer", key: "Customer", width: 28 },
      { header: "Nama", key: "Nama", width: 30 },
      {
        header: "Jml SPK",
        key: "SpkJumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Jml Jadi",
        key: "SpkJumlahJadi",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Ukuran", key: "Ukuran", width: 18 },
      { header: "Tipe", key: "Tipe", width: 12 },
      {
        header: "Panjang",
        key: "Panjang",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Lebar",
        key: "Lebar",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Gramasi", key: "Gramasi", width: 14 },
      { header: "Kain", key: "Kain", width: 18 },
      { header: "Finishing", key: "Finishing", width: 14 },
      { header: "Status", key: "Status", width: 12 },
      {
        header: "Minus",
        key: "Minus",
        width: 12,
        align: "right",
        numFmt: "#,##0.0000",
      },
    ];
    await exportExcelSingle(
      `Standart_Babaran_vs_Realisasi_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      "Babaran vs Realisasi",
      columns,
      items.value,
      "LAPORAN STANDART BABARAN VS REALISASI (MASTER)",
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
    const res = await standartBabaranVsRealisasiService.getAllDetail(
      filters.value.startDate,
      filters.value.endDate,
      filters.value.cabang,
      filters.value.mode,
    );
    const rows = res.data.data || [];
    if (!rows.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }
    const columns: ExcelColumn[] = [
      { header: "No. SPK", key: "Nomor", width: 18 },
      { header: "Customer", key: "Customer", width: 26 },
      { header: "Nama", key: "Nama", width: 28 },
      { header: "Komponen", key: "Komponen", width: 16 },
      {
        header: "Babaran Standar",
        key: "BabaranStandar",
        width: 14,
        align: "right",
        numFmt: "#,##0.0000",
      },
      {
        header: "Babaran Realisasi",
        key: "BabaranRealisasi",
        width: 14,
        align: "right",
        numFmt: "#,##0.0000",
      },
      {
        header: "Selisih",
        key: "Selisih",
        width: 12,
        align: "right",
        numFmt: "#,##0.0000",
      },
      {
        header: "Selisih %",
        key: "SelisihPersen",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Jml MKB",
        key: "JumlahMKB",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Jml LHK",
        key: "JumlahLHK",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Terpakai",
        key: "Terpakai",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Alasan", key: "Alasan", width: 30 },
    ];
    await exportExcel(
      `Standart_Babaran_vs_Realisasi_Detail_${filters.value.startDate}_to_${filters.value.endDate}.xlsx`,
      [
        {
          sheetName: "Rincian Komponen",
          columns,
          rows,
          title: "RINCIAN BABARAN PER KOMPONEN",
        },
      ],
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// ── Row coloring — replikasi persis cxGrdMasterStylesGetContentStyle:
// SELURUH baris merah kalau Minus < 0 (bukan cuma sel Minus).
// ──
const getRowProps = (data: any) => {
  const item = data.item?.raw || data.item;
  if (Number(item?.Minus) < 0) {
    return { style: "color:#c62828; font-weight:600" };
  }
  return {};
};

onMounted(fetchData);
</script>

<template>
  <BaseBrowse
    title="Standart Babaran vs Realisasi"
    :menu-id="menuId"
    :icon="IconScale"
    :headers="masterHeaders"
    :items="items ?? []"
    item-value="Nomor"
    :is-loading="isLoading"
    show-expand
    :expanded="expandedRows"
    :row-props-fn="getRowProps"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
  >
    <template #filter-left>
      <span class="f-label">Filter</span>
      <select v-model="filters.mode" class="f-sel">
        <option value="spk">Tanggal SPK</option>
        <option value="lhk">Tanggal LHK</option>
      </select>

      <input type="date" v-model="filters.startDate" class="f-date" />
      <span class="f-sep">sd</span>
      <input type="date" v-model="filters.endDate" class="f-date" />

      <div class="f-divider" />

      <span class="f-label">Cabang</span>
      <select v-model="filters.cabang" class="f-sel">
        <option value="ALL">ALL</option>
        <option value="P01">P01</option>
        <option value="P04">P04</option>
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

    <template #item.TanggalSpk="{ item }">
      {{ formatTanggal(item.TanggalSpk) }}
    </template>
    <template #item.Dateline="{ item }">
      {{ formatTanggal(item.Dateline) }}
    </template>
    <template #item.SpkJumlah="{ item }">{{ fmtNum(item.SpkJumlah) }}</template>
    <template #item.SpkJumlahJadi="{ item }">{{
      fmtNum(item.SpkJumlahJadi)
    }}</template>
    <template #item.Panjang="{ item }">{{ fmtNum(item.Panjang, 2) }}</template>
    <template #item.Lebar="{ item }">{{ fmtNum(item.Lebar, 2) }}</template>
    <template #item.Status="{ item }">
      <span
        class="status-chip"
        :class="{
          'status-close': item.Status === 'CLOSE',
          'status-proses': item.Status === 'OnProses',
          'status-belum': item.Status === 'BELUM',
        }"
      >
        {{ item.Status }}
      </span>
    </template>
    <template #item.Minus="{ item }">
      <span :class="{ 'text-error font-weight-bold': Number(item.Minus) < 0 }">
        {{ fmtNum(item.Minus, 4) }}
      </span>
    </template>

    <template #detail="{ item }">
      <div class="detail-wrap">
        <div v-if="detailLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span class="ml-2 text-caption text-grey">Memuat komponen...</span>
        </div>
        <table v-else class="dtl-table">
          <thead>
            <tr>
              <th style="width: 110px">Komponen</th>
              <th style="width: 100px" class="tr">Babaran Std</th>
              <th style="width: 100px" class="tr">Babaran Real.</th>
              <th style="width: 90px" class="tr">Selisih</th>
              <th style="width: 90px" class="tr">Selisih %</th>
              <th style="width: 90px" class="tr">Jml MKB</th>
              <th style="width: 90px" class="tr">Jml LHK</th>
              <th style="width: 90px" class="tr">Terpakai</th>
              <th style="min-width: 180px">Alasan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in detailData[item.Nomor]" :key="i">
              <td class="font-weight-bold text-primary">{{ d.Komponen }}</td>
              <td class="tr">{{ fmtNum(d.BabaranStandar, 4) }}</td>
              <td class="tr">{{ fmtNum(d.BabaranRealisasi, 4) }}</td>
              <td class="tr">
                <span
                  :class="{
                    'text-error font-weight-bold': Number(d.Selisih) < 0,
                  }"
                >
                  {{ fmtNum(d.Selisih, 4) }}
                </span>
              </td>
              <td class="tr">
                <span
                  :class="{
                    'text-error font-weight-bold': Number(d.SelisihPersen) < 0,
                  }"
                >
                  {{ fmtNum(d.SelisihPersen, 2) }}%
                </span>
              </td>
              <td class="tr">{{ fmtNum(d.JumlahMKB, 2) }}</td>
              <td class="tr">{{ fmtNum(d.JumlahLHK, 2) }}</td>
              <td class="tr">{{ fmtNum(d.Terpakai, 2) }}</td>
              <td>{{ d.Alasan || "-" }}</td>
            </tr>
            <tr v-if="!detailData[item.Nomor]?.length">
              <td colspan="9" class="empty-row">Tidak ada data komponen.</td>
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
  margin-right: 8px;
}
.f-sel:focus {
  border-color: #1976d2;
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

.status-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.status-close {
  background: #e8f5e9;
  color: #2e7d32;
}
.status-proses {
  background: #fff3e0;
  color: #e65100;
}
.status-belum {
  background: #ffebee;
  color: #c62828;
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
