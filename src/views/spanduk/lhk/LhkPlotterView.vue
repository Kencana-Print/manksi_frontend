<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import * as lhkService from "@/services/spanduk/lhk/lhkPlotterService";
import type {
  LhkPlotterRow,
  LhkPlotterDetailRow,
} from "@/services/spanduk/lhk/lhkPlotterService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { IconPrinter, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

interface ExportDetailRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string;
  Nama_Pabrik: string;
  Nomor_SPK: string;
  Nama_SPK: string;
  Jumlah_Order: number;
  Panjang: number;
  Lebar: number;
  J_Meter: number;
  J_Lembar: number;
  J_TotalMeter: number;
  J_PK: number;
  J_MK: number;
  J_Tinta: number;
  Keterangan: string;
}

const toast = useToast();
const router = useRouter();

// --- STATE FILTER: default awal bulan s.d. hari ini ---
const d = new Date();

const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const firstDay = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
const today = toLocalDateStr(d);

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
});

// --- DETAIL: dimuat sekali untuk seluruh periode, dikelompokkan per nomor ---
const detailRows = ref<LhkPlotterDetailRow[]>([]);
const detailMap = ref<Record<string, LhkPlotterDetailRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<LhkPlotterRow[]> => {
  const { dtAwal, dtAkhir } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const [master, detail] = await Promise.all([
    lhkService.getBrowse(dtAwal, dtAkhir),
    lhkService.getDetail(dtAwal, dtAkhir),
  ]);

  const peta: Record<string, LhkPlotterDetailRow[]> = {};
  for (const row of detail) {
    (peta[row.Nomor] ??= []).push(row);
  }
  detailRows.value = detail;
  detailMap.value = peta;
  expandedRows.value = [];
  return master;
};

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 30 },
];

const NUM = "#,##0.00";
const kolomDetail: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 28 },
  { header: "Nomor SPK", key: "Nomor_SPK", width: 20 },
  { header: "Nama SPK", key: "Nama_SPK", width: 36 },
  {
    header: "Jumlah Order",
    key: "Jumlah_Order",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  { header: "Panjang", key: "Panjang", width: 10, align: "right", numFmt: NUM },
  { header: "Lebar", key: "Lebar", width: 10, align: "right", numFmt: NUM },
  { header: "J Meter", key: "J_Meter", width: 10, align: "right", numFmt: NUM },
  {
    header: "J Lembar",
    key: "J_Lembar",
    width: 10,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "J Total Meter",
    key: "J_TotalMeter",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  { header: "J PK", key: "J_PK", width: 10, align: "right", numFmt: NUM },
  { header: "J MK", key: "J_MK", width: 10, align: "right", numFmt: NUM },
  { header: "J Tinta", key: "J_Tinta", width: 10, align: "right", numFmt: NUM },
  { header: "Keterangan", key: "Keterangan", width: 36 },
];

// Data master yang sedang tampil (ikut search + filter kolom BaseBrowse)
const dataTampil = (): LhkPlotterRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

const exportMaster = () =>
  exportToExcel("LHK_Plotter_Header", {
    columns: kolomMaster,
    getData: () =>
      dataTampil().map((r) => ({ ...r, Tanggal: formatTanggal(r.Tanggal) })),
  });

// --- BROWSE SETUP ---
const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selectedItem,
  fetchData,
  exportToExcel,
} = useBrowse<LhkPlotterRow>({
  menuId: "4",
  fetchApi: muatData,
  immediate: false, // dipanggil manual setelah mount
});

const headers = [
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Kode Pabrik", key: "Kode_Pabrik", width: "120px" },
  { title: "Nama Pabrik", key: "Nama_Pabrik", width: "260px" },
];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- HANDLERS ---
const onAdd = () => {
  router.push({ name: "SpandukLhkPlotterCreate" });
};

const onEdit = (item: LhkPlotterRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({ name: "SpandukLhkPlotterEdit", params: { nomor: item.Nomor } });
};

const onDelete = async (item: LhkPlotterRow) => {
  try {
    await lhkService.remove(item.Nomor);
    toast.success(`LHK Plotter ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(lhkService.pesanError(e, "Gagal menghapus data."));
  }
};

const onPrint = () => {
  const item = selectedItem.value;
  if (!item) {
    return toast.warning("Pilih data LHK Plotter terlebih dahulu.");
  }
  const url = router.resolve({
    name: "SpandukLhkPlotterPrint",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT DETAIL: hanya LHK yang sedang tampil di grid ---
const exportDetail = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }

  const master = dataTampil();
  if (master.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: ExportDetailRow[] = [];
  for (const item of master) {
    for (const r of detailMap.value[item.Nomor] ?? []) {
      rows.push({
        Nomor: item.Nomor,
        Tanggal: formatTanggal(item.Tanggal),
        Kode_Pabrik: item.Kode_Pabrik ?? "",
        Nama_Pabrik: item.Nama_Pabrik ?? "",
        Nomor_SPK: r.Nomor_SPK,
        Nama_SPK: r.Nama_SPK ?? "",
        Jumlah_Order: Number(r.Jumlah_Order) || 0,
        Panjang: Number(r.Panjang) || 0,
        Lebar: Number(r.Lebar) || 0,
        J_Meter: Number(r.J_Meter) || 0,
        J_Lembar: Number(r.J_Lembar) || 0,
        J_TotalMeter: Number(r.J_TotalMeter) || 0,
        J_PK: Number(r.J_PK) || 0,
        J_MK: Number(r.J_MK) || 0,
        J_Tinta: Number(r.J_Tinta) || 0,
        Keterangan: r.Keterangan ?? "",
      });
    }
  }

  if (rows.length === 0) {
    return toast.warning("Tidak ada detail pada data yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Detail_LHK_Plotter_${today}.xlsx`,
      "Detail LHK Plotter",
      kolomDetail,
      rows,
    );
    toast.success("Berhasil export detail LHK Plotter.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail LHK Plotter.");
  }
};

const numFmt = (v: number | null) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "0";
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Plotter"
    menu-id="4"
    storage-id="spanduk-lhk-plotter"
    :icon="IconPrinter"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Nomor"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="fetchData"
    @export="exportToExcel('LHK_Plotter_Header')"
    show-expand
    v-model:expanded="expandedRows"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <!-- Detail Expand -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">Detail SPK - {{ item.Nomor }}</div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="130">Nomor SPK</th>
              <th>Nama SPK</th>
              <th width="90" class="tr">Jml Order</th>
              <th width="80" class="tr">Panjang</th>
              <th width="80" class="tr">Lebar</th>
              <th width="80" class="tr">J Meter</th>
              <th width="80" class="tr">J Lembar</th>
              <th width="100" class="tr">J Total Meter</th>
              <th width="70" class="tr">J PK</th>
              <th width="70" class="tr">J MK</th>
              <th width="80" class="tr">J Tinta</th>
              <th width="200">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in detailMap[item.Nomor]" :key="r.Nomor_SPK">
              <td>{{ r.Nomor_SPK }}</td>
              <td class="font-weight-bold">{{ r.Nama_SPK }}</td>
              <td class="tr">{{ numFmt(r.Jumlah_Order) }}</td>
              <td class="tr">{{ numFmt(r.Panjang) }}</td>
              <td class="tr">{{ numFmt(r.Lebar) }}</td>
              <td class="tr">{{ numFmt(r.J_Meter) }}</td>
              <td class="tr">{{ numFmt(r.J_Lembar) }}</td>
              <td class="tr text-blue-darken-2 font-weight-bold">
                {{ numFmt(r.J_TotalMeter) }}
              </td>
              <td class="tr">{{ numFmt(r.J_PK) }}</td>
              <td class="tr">{{ numFmt(r.J_MK) }}</td>
              <td class="tr">{{ numFmt(r.J_Tinta) }}</td>
              <td>{{ r.Keterangan || "-" }}</td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td colspan="12" class="text-center text-grey py-3 font-italic">
                Detail LHK Plotter tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn size="small" color="deep-purple-darken-1" @click="exportDetail">
        <template #prepend><IconFileExport :size="15" /></template>Export Detail
      </v-btn>
    </template>
  </BaseBrowse>
</template>

<style scoped>
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
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-sep {
  font-size: 11px;
  color: #777;
}

.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
</style>
