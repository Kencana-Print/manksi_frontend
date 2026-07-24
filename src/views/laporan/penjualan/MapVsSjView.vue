<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { mapVsSjService } from "@/services/laporan/penjualan/mapVsSjService";
import api from "@/services/api";
import { IconTruckDelivery, IconTableOptions } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

// ── UTILITAS EXPORT EXCELJS ──
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const menuId = "307";

// ── SETUP FILTER ──
const today = new Date();
const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  .toISOString()
  .substring(0, 10);
const todayString = today.toISOString().substring(0, 10);

const filters = ref({
  startDate: firstDayOfMonth,
  endDate: todayString,
  divisi: "0",
});

const divisiOptions = ref<any[]>([]);
const loadDivisi = async () => {
  try {
    const res = await api.get("/lookups/divisi");
    divisiOptions.value = [
      { kode: "0", nama: "ALL" },
      ...res.data.data.map((d: any) => ({
        kode: d.kode,
        nama: `${d.kode} - ${d.nama}`,
      })),
    ];
  } catch {
    divisiOptions.value = [{ kode: "0", nama: "ALL" }];
  }
};

// ── BROWSE HOOK ──
const masterHeaders = [
  { title: "Nomor MAP", key: "Nomor", width: "160px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Divisi", key: "Divisi", width: "90px", align: "center" },
  { title: "Nama Customer", key: "NamaCustomer", minWidth: "200px" },
  { title: "Nama Pekerjaan", key: "Nama", minWidth: "220px" },
  { title: "Ukuran", key: "Ukuran", width: "100px" },
  { title: "Jenis", key: "Jenis", width: "80px", align: "center" },
  { title: "Jumlah", key: "Jumlah", width: "90px", align: "right" },
  { title: "Kirim", key: "Kirim", width: "90px", align: "right" },
  { title: "Dateline", key: "Dateline", width: "100px", align: "center" },
  { title: "Sales", key: "Sales", width: "120px" },
];

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId,
  fetchApi: async () => {
    const res = await mapVsSjService.getBrowse(filters.value);
    return res.data.data;
  },
  immediate: false,
});

onMounted(async () => {
  await loadDivisi();
  fetchData();
});

watch(
  [
    () => filters.value.startDate,
    () => filters.value.endDate,
    () => filters.value.divisi,
  ],
  fetchData,
);

// ── LAZY LOAD DETAIL ──
const expandedRows = ref<string[]>([]);
const detailData = ref<Record<string, any[]>>({});
const detailLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (val: any[]) => {
  expandedRows.value = val;
  const nomorList = val.map((v) => (typeof v === "object" ? v.Nomor : v));
  for (const nomor of nomorList.filter((n) => n && !detailData.value[n])) {
    detailLoading.value[nomor] = true;
    try {
      const res = await mapVsSjService.getDetail(nomor);
      detailData.value[nomor] = res.data.data;
    } catch {
      detailData.value[nomor] = [];
    } finally {
      detailLoading.value[nomor] = false;
    }
  }
};

// ── EXPORT EXCEL MASTER ──
const isExportingMaster = ref(false);
const onExportMaster = async () => {
  if (!items.value || items.value.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingMaster.value = true;
  try {
    const excelCols: ExcelColumn[] = [
      { header: "Nomor MAP", key: "Nomor", width: 22 },
      { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 10, align: "center" },
      { header: "Customer", key: "NamaCustomer", width: 30 },
      { header: "Nama Pekerjaan", key: "Nama", width: 40 },
      { header: "Ukuran", key: "Ukuran", width: 15 },
      { header: "Jenis", key: "Jenis", width: 10, align: "center" },
      {
        header: "Jumlah",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Kirim",
        key: "Kirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Dateline", key: "Dateline", width: 14, align: "center" },
      { header: "Sales", key: "Sales", width: 20 },
    ];

    const rowsData = items.value.map((r: any) => ({
      ...r,
      Jumlah: Number(r.Jumlah) || 0,
      Kirim: Number(r.Kirim) || 0,
    }));

    await exportExcelSingle(
      `Laporan_MAP_vs_SJ_${filters.value.startDate}_sd_${filters.value.endDate}.xlsx`,
      "Master MAP",
      excelCols,
      rowsData,
      `LAPORAN MAP vs SURAT JALAN (${filters.value.startDate} s/d ${filters.value.endDate})`,
    );
  } catch (error) {
    toast.error("Gagal export master MAP.");
  } finally {
    isExportingMaster.value = false;
  }
};

// ── EXPORT EXCEL DETAIL ──
const isExportingDetail = ref(false);
const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await mapVsSjService.getAllDetail(filters.value);
    const allDetail: any[] = res.data.data;
    if (!allDetail.length) {
      toast.warning("Tidak ada data detail pengiriman pada range tanggal ini.");
      return;
    }

    const fmtTgl = (v: string) => {
      if (!v) return "";
      const s = String(v).substring(0, 10);
      const [y, m, d] = s.split("-");
      return `${d}/${m}/${y}`;
    };

    // ✅ Kelompokkan per Nomor MAP (jaga urutan kemunculan pertama)
    const groups: Record<string, any[]> = {};
    const order: string[] = [];
    allDetail.forEach((r) => {
      const key = r.NomorMAP;
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
        NomorMAP: first.NomorMAP,
        TglMAP: fmtTgl(first.TglMAP),
        Divisi: first.Divisi,
        NamaCustomer: first.NamaCustomer,
        NamaMAP: first.NamaMAP,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      rowsInGroup.forEach((r, idx) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          NomorSJ: r.NomorSJ,
          TglSJ: fmtTgl(r.TglSJ),
          KeteranganSJ: r.KeteranganSJ,
          JumlahKirim: Number(r.JumlahKirim) || 0,
        });
      });
    });

    const columns: ExcelColumn[] = [
      { header: "Nomor MAP", key: "NomorMAP", width: 22 },
      { header: "Tgl MAP", key: "TglMAP", width: 14, align: "center" },
      { header: "Divisi", key: "Divisi", width: 12, align: "center" },
      { header: "Customer", key: "NamaCustomer", width: 30 },
      { header: "Nama MAP", key: "NamaMAP", width: 30 },
      { header: "Nomor SJ", key: "NomorSJ", width: 20 },
      { header: "Tgl SJ", key: "TglSJ", width: 14, align: "center" },
      { header: "Keterangan", key: "KeteranganSJ", width: 30 },
      {
        header: "Jml Kirim",
        key: "JumlahKirim",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
    ];

    await exportExcelSingle(
      `Export_Detail_MAP_vs_SJ_${filters.value.startDate}.xlsx`,
      "Detail SJ per MAP",
      columns,
      combinedRows,
      `Detail Pengiriman MAP  |  Periode: ${fmtTgl(filters.value.startDate)} s.d ${fmtTgl(filters.value.endDate)}`,
    );

    toast.success("Berhasil export detail.");
  } catch (e: any) {
    toast.error("Gagal export detail pengiriman.");
  } finally {
    isExportingDetail.value = false;
  }
};

const numFmt = (val: number) => new Intl.NumberFormat("id-ID").format(val || 0);
</script>

<template>
  <BaseBrowse
    title="Laporan MAP vs Surat Jalan"
    :menu-id="menuId"
    :icon="IconTruckDelivery"
    :headers="masterHeaders"
    :items="items ?? []"
    :is-loading="isLoading"
    :can-export="canExport"
    show-expand
    item-value="Nomor"
    v-model:expanded="expandedRows"
    v-model:filter-state="filters"
    @refresh="fetchData"
    @export="onExportMaster"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filters.startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filters.endDate" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Divisi</span>
        <select v-model="filters.divisi" class="f-select">
          <option
            v-for="opt in divisiOptions"
            :key="opt.kode"
            :value="opt.kode"
          >
            {{ opt.nama }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canExport"
        size="small"
        color="teal-darken-1"
        variant="elevated"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        Export Detail
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Dateline="{ item }">{{
      formatTanggal(item.Dateline)
    }}</template>
    <template #item.Jumlah="{ item }">{{ numFmt(item.Jumlah) }}</template>
    <template #item.Kirim="{ item }">
      <span class="font-weight-bold text-success">{{
        numFmt(item.Kirim)
      }}</span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div v-if="detailLoading[item.Nomor]" class="detail-loading">
          <v-progress-circular indeterminate color="primary" size="24" />
          <span class="ml-2 text-caption text-grey"
            >Memuat detail Surat Jalan...</span
          >
        </div>

        <template v-else>
          <div class="expand-header mb-2">
            <IconTableOptions :size="14" class="mr-1" />
            Detail Pengiriman MAP:
            <span class="text-primary">{{ item.Nomor }}</span>
          </div>

          <table class="detail-table">
            <thead>
              <tr>
                <th style="width: 150px">Nomor SJ</th>
                <th style="width: 100px; text-align: center">Tanggal SJ</th>
                <th style="min-width: 180px">Keterangan</th>
                <th style="width: 200px">Alamat Kirim</th>
                <th style="width: 120px; text-align: center">Kota</th>
                <th style="width: 100px; text-align: right">Jumlah Kirim</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(det, idx) in detailData[item.Nomor]" :key="idx">
                <td class="font-weight-bold">{{ det.NomorSj }}</td>
                <td class="text-center">{{ formatTanggal(det.TanggalSj) }}</td>
                <td>{{ det.Keterangan }}</td>
                <td>{{ det.Alamat }}</td>
                <td class="text-center">{{ det.Kota }}</td>
                <td class="text-right fw text-success">
                  {{ numFmt(det.Jumlah) }}
                </td>
              </tr>
              <tr v-if="!detailData[item.Nomor]?.length">
                <td
                  colspan="6"
                  class="text-center text-caption text-grey py-3 font-italic"
                >
                  Belum ada Surat Jalan (pengiriman) untuk MAP ini.
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
/* ── UI Filter Standar ── */
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  background: white;
  outline: none;
}
.f-date:focus,
.f-select:focus {
  border-color: #1565c0;
}
.f-select {
  font-weight: 600;
  min-width: 140px;
}

/* ── Expand Area ── */
.expand-wrap {
  padding: 12px 14px;
  background: #f0f4f8;
  border-top: 2px solid #e3e8ef;
}
.detail-loading {
  display: flex;
  align-items: center;
  padding: 10px;
  color: #555;
}
.expand-header {
  display: flex;
  align-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #37474f;
}

/* ── Detail Table ── */
.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}
.detail-table th {
  background: #0277bd;
  color: white;
  font-weight: 600;
  padding: 6px 10px;
  border: 1px solid #01579b;
  text-align: left;
}
.detail-table td {
  padding: 5px 10px;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}
.detail-table tbody tr:hover td {
  background: #e3f2fd;
}
.fw {
  font-weight: 700;
}
</style>
