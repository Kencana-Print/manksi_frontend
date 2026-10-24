<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import * as lhkService from "@/services/spanduk/lhk/lhkTintaService";
import type {
  LhkTintaRow,
  LhkTintaDetailRow,
} from "@/services/spanduk/lhk/lhkTintaService";
import { IconPalette, IconPrinter, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

interface ExportDetailRow {
  Nomor: string;
  Tanggal: string;
  Nomor_Cetak: string;
  Kode_Pabrik: string;
  Nama_Pabrik: string;
  Jml_SPK: number | null;
  Jml_Bahan: number | null;
  Kode_Bahan: string;
  Nama_Bahan: string;
  Qty_Input: number;
  Satuan_Input: string;
  Qty: number;
  Satuan: string;
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
const detailMap = ref<Record<string, LhkTintaDetailRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<LhkTintaRow[]> => {
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

  const peta: Record<string, LhkTintaDetailRow[]> = {};
  for (const row of detail) {
    (peta[row.Nomor] ??= []).push(row);
  }
  detailMap.value = peta;
  expandedRows.value = [];
  return master;
};

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
} = useBrowse<LhkTintaRow>({
  menuId: "4",
  fetchApi: muatData,
  immediate: false, // dipanggil manual setelah mount
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const headers = [
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "LHK Cetak", key: "Nomor_Cetak", width: "170px" },
  { title: "Tgl Cetak", key: "Tanggal_Cetak", width: "110px", align: "center" },
  { title: "Kode Pabrik", key: "Kode_Pabrik", width: "120px" },
  { title: "Nama Pabrik", key: "Nama_Pabrik", width: "240px" },
  { title: "Jml SPK", key: "Jml_SPK", width: "90px", align: "end" },
  { title: "Jml Bahan", key: "Jml_Bahan", width: "100px", align: "end" },
];

const INT = "#,##0";
const NUM = "#,##0.00";

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "LHK Cetak", key: "Nomor_Cetak", width: 20 },
  { header: "Tgl Cetak", key: "Tanggal_Cetak", width: 14, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 30 },
  { header: "Jml SPK", key: "Jml_SPK", width: 10, align: "right", numFmt: INT },
  {
    header: "Jml Bahan",
    key: "Jml_Bahan",
    width: 11,
    align: "right",
    numFmt: INT,
  },
];

const kolomDetail: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "LHK Cetak", key: "Nomor_Cetak", width: 20 },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 28 },
  { header: "Jml SPK", key: "Jml_SPK", width: 10, align: "right", numFmt: INT },
  {
    header: "Jml Bahan",
    key: "Jml_Bahan",
    width: 11,
    align: "right",
    numFmt: INT,
  },
  { header: "Kode Bahan", key: "Kode_Bahan", width: 12 },
  { header: "Nama Bahan", key: "Nama_Bahan", width: 36 },
  {
    header: "Qty Input",
    key: "Qty_Input",
    width: 12,
    align: "right",
    numFmt: "#,##0.0000",
  },
  { header: "Satuan Input", key: "Satuan_Input", width: 13 },
  {
    header: "Qty",
    key: "Qty",
    width: 12,
    align: "right",
    numFmt: "#,##0.0000",
  },
  { header: "Satuan", key: "Satuan", width: 10 },
];

// Data master yang sedang tampil (ikut search + filter kolom BaseBrowse)
const dataTampil = (): LhkTintaRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- HANDLERS ---
const onAdd = () => {
  router.push({ name: "SpandukLhkTintaCreate" });
};

const onEdit = (item: LhkTintaRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({
    name: "SpandukLhkTintaEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: LhkTintaRow) => {
  try {
    await lhkService.remove(item.Nomor);
    toast.success(`LHK Tinta ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(lhkService.pesanError(e, "Gagal menghapus data."));
  }
};

const onPrint = () => {
  const item = selectedItem.value;
  if (!item) {
    return toast.warning("Pilih data LHK Tinta terlebih dahulu.");
  }
  const url = router.resolve({
    name: "SpandukLhkTintaPrint",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT ---
const exportMaster = () =>
  exportToExcel("LHK_Tinta_Header", {
    columns: kolomMaster,
    getData: () =>
      dataTampil().map((r) => ({
        ...r,
        Tanggal: formatTanggal(r.Tanggal),
        Tanggal_Cetak: r.Tanggal_Cetak ? formatTanggal(r.Tanggal_Cetak) : "",
      })),
  });

// Hanya detail dari LHK yang sedang tampil di grid
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
    (detailMap.value[item.Nomor] ?? []).forEach((r, idx) => {
      // Data LHK (header) hanya di baris pertama tiap LHK
      const pertama = idx === 0;
      rows.push({
        Nomor: pertama ? item.Nomor : "",
        Tanggal: pertama ? formatTanggal(item.Tanggal) : "",
        Nomor_Cetak: pertama ? (item.Nomor_Cetak ?? "") : "",
        Kode_Pabrik: pertama ? (item.Kode_Pabrik ?? "") : "",
        Nama_Pabrik: pertama ? (item.Nama_Pabrik ?? "") : "",
        Jml_SPK: pertama ? Number(item.Jml_SPK) || 0 : null,
        Jml_Bahan: pertama ? Number(item.Jml_Bahan) || 0 : null,
        Kode_Bahan: String(r.Kode_Bahan),
        Nama_Bahan: r.Nama_Bahan ?? "",
        Qty_Input: Number(r.Qty_Input) || 0,
        Satuan_Input: r.Satuan_Input ?? "",
        Qty: Number(r.Qty) || 0,
        Satuan: r.Satuan ?? "",
      });
    });
  }

  if (rows.length === 0) {
    return toast.warning("Tidak ada detail pada data yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Detail_LHK_Tinta_${today}.xlsx`,
      "Detail LHK Tinta",
      kolomDetail,
      rows,
    );
    toast.success("Berhasil export detail LHK Tinta.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail LHK Tinta.");
  }
};

const numFmt = (v: number | null) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 4 }) : "0";
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Pemakaian Obat"
    menu-id="4"
    storage-id="spanduk-lhk-tinta"
    :icon="IconPalette"
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
    @export="exportMaster"
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

    <template #item.Tanggal_Cetak="{ item }">
      {{ item.Tanggal_Cetak ? formatTanggal(item.Tanggal_Cetak) : "" }}
    </template>

    <!-- Detail Expand -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          Pemakaian Tinta/Cat - {{ item.Nomor }} (LHK Cetak
          {{ item.Nomor_Cetak }})
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="80">Kode</th>
              <th>Bahan</th>
              <th width="100" class="tr">Qty Input</th>
              <th width="90">Satuan Input</th>
              <th width="100" class="tr">Qty</th>
              <th width="70">Satuan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in detailMap[item.Nomor]" :key="r.Kode_Bahan">
              <td>{{ r.Kode_Bahan }}</td>
              <td class="font-weight-bold">{{ r.Nama_Bahan }}</td>
              <td class="tr">{{ numFmt(r.Qty_Input) }}</td>
              <td>{{ r.Satuan_Input ?? "" }}</td>
              <td class="tr">{{ numFmt(r.Qty) }}</td>
              <td>{{ r.Satuan ?? "" }}</td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td colspan="6" class="text-center text-grey py-3 font-italic">
                Detail LHK Tinta tidak ditemukan.
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
