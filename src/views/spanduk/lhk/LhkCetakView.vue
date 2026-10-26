<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import * as lhkService from "@/services/spanduk/lhk/lhkCetakService";
import type {
  LhkCetakRow,
  LhkCetakDetailRow,
} from "@/services/spanduk/lhk/lhkCetakService";
import { IconPrinter, IconFileExport } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

interface ExportMasterRow {
  Nomor: string;
  Tanggal: string;
  Sesi: string;
  Kode_Pabrik: string;
  Nama_Pabrik: string;
  Kar_Borongan: number;
  Kar_Harian: number;
  Jml_Meter: number;
}

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
  Qty_Cetak: number;
  Output_Produksi: number;
  Jml_Plangkan: number;
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
const detailMap = ref<Record<string, LhkCetakDetailRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<LhkCetakRow[]> => {
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

  const peta: Record<string, LhkCetakDetailRow[]> = {};
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
} = useBrowse<LhkCetakRow>({
  menuId: "4",
  fetchApi: muatData,
  immediate: false, // dipanggil manual setelah mount
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const headers = [
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Sesi", key: "Sesi", width: "90px", align: "center" },
  { title: "Kode Pabrik", key: "Kode_Pabrik", width: "120px" },
  { title: "Nama Pabrik", key: "Nama_Pabrik", width: "260px" },
  { title: "Kar Borongan", key: "Kar_Borongan", width: "120px", align: "end" },
  { title: "Kar Harian", key: "Kar_Harian", width: "110px", align: "end" },
  { title: "Output Produksi", key: "Jml_Meter", width: "140px", align: "end" },
];

const INT = "#,##0";
const NUM = "#,##0.00";

const sesiLabel = (s: string | null | undefined): string =>
  s === "PAGI" ? "Pagi" : s === "SIANG" ? "Siang" : "-";

// Output Produksi = panjang x J. Cetak (dihitung, tidak disimpan)
const outputProduksi = (
  panjang: number | null | undefined,
  qty: number | null | undefined,
): number =>
  Math.round((Number(panjang) || 0) * (Number(qty) || 0) * 100) / 100;

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Sesi", key: "Sesi", width: 10, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 30 },
  {
    header: "Kar Borongan",
    key: "Kar_Borongan",
    width: 14,
    align: "right",
    numFmt: INT,
  },
  {
    header: "Kar Harian",
    key: "Kar_Harian",
    width: 12,
    align: "right",
    numFmt: INT,
  },
  {
    header: "Output Produksi",
    key: "Jml_Meter",
    width: 16,
    align: "right",
    numFmt: NUM,
  },
];

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
  {
    header: "Qty Cetak",
    key: "Qty_Cetak",
    width: 12,
    align: "right",
    numFmt: INT,
  },
  {
    header: "Output Produksi",
    key: "Output_Produksi",
    width: 16,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "Jml Plangkan",
    key: "Jml_Plangkan",
    width: 13,
    align: "right",
    numFmt: INT,
  },
];

// Data master yang sedang tampil (ikut search + filter kolom BaseBrowse)
const dataTampil = (): LhkCetakRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- HANDLERS ---
const onAdd = () => {
  router.push({ name: "SpandukLhkCetakCreate" });
};

const onEdit = (item: LhkCetakRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({
    name: "SpandukLhkCetakEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: LhkCetakRow) => {
  try {
    await lhkService.remove(item.Nomor);
    toast.success(`LHK Cetak ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(lhkService.pesanError(e, "Gagal menghapus data."));
  }
};

const onPrint = () => {
  const item = selectedItem.value;
  if (!item) {
    return toast.warning("Pilih data LHK Cetak terlebih dahulu.");
  }
  const url = router.resolve({
    name: "SpandukLhkCetakPrint",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT ---
const exportMaster = () =>
  exportToExcel("LHK_Cetak_Header", {
    columns: kolomMaster,
    getData: (): ExportMasterRow[] =>
      dataTampil().map((r) => ({
        Nomor: r.Nomor,
        Tanggal: formatTanggal(r.Tanggal),
        Sesi: sesiLabel(r.Sesi),
        Kode_Pabrik: r.Kode_Pabrik ?? "",
        Nama_Pabrik: r.Nama_Pabrik ?? "",
        Kar_Borongan: Number(r.Kar_Borongan) || 0,
        Kar_Harian: Number(r.Kar_Harian) || 0,
        Jml_Meter: Number(r.Jml_Meter) || 0,
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
        Qty_Cetak: Number(r.Qty_Cetak) || 0,
        Output_Produksi: outputProduksi(r.Panjang, r.Qty_Cetak),
        Jml_Plangkan: Number(r.Jml_Plangkan) || 0,
      });
    }
  }

  if (rows.length === 0) {
    return toast.warning("Tidak ada detail pada data yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Detail_LHK_Cetak_${today}.xlsx`,
      "Detail LHK Cetak",
      kolomDetail,
      rows,
    );
    toast.success("Berhasil export detail LHK Cetak.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail LHK Cetak.");
  }
};

const numFmt = (v: number | string | null) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "0";
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Cetak"
    menu-id="4"
    storage-id="spanduk-lhk-cetak"
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

    <template #item.Sesi="{ item }">
      {{ sesiLabel(item.Sesi) }}
    </template>

    <template #item.Jml_Meter="{ item }">
      {{
        Number(item.Jml_Meter ?? 0).toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      }}
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
              <th width="90" class="tr">Qty Cetak</th>
              <th width="110" class="tr">Output Produksi</th>
              <th width="100" class="tr">Jml Plangkan</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in detailMap[item.Nomor]" :key="r.Nomor_SPK">
              <td>{{ r.Nomor_SPK }}</td>
              <td class="font-weight-bold">{{ r.Nama_SPK }}</td>
              <td class="tr">{{ numFmt(r.Jumlah_Order) }}</td>
              <td class="tr">{{ numFmt(r.Panjang) }}</td>
              <td class="tr">{{ numFmt(r.Lebar) }}</td>
              <td class="tr">{{ numFmt(r.Qty_Cetak) }}</td>
              <td class="tr">
                {{ numFmt(outputProduksi(r.Panjang, r.Qty_Cetak)) }}
              </td>
              <td class="tr">{{ numFmt(r.Jml_Plangkan) }}</td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td colspan="8" class="text-center text-grey py-3 font-italic">
                Detail LHK Cetak tidak ditemukan.
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
