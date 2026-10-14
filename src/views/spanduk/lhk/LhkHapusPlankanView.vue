<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import * as lhkService from "@/services/spanduk/lhk/lhkHapusPlankanService";
import type {
  LhkHapusPlankanRow,
  LhkHapusPlankanDetailRow,
} from "@/services/spanduk/lhk/lhkHapusPlankanService";
import { IconEraser, IconPrinter, IconFileExport } from "@tabler/icons-vue";
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
  J_Plangkan: number;
  J_Meter: number;
  Ukuran: number;
  Jumlah_Meter: number;
  Rinso: number;
  Porstek: number;
  M46: number;
  Kaporit: number;
  Caustik: number;
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
const detailMap = ref<Record<string, LhkHapusPlankanDetailRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<LhkHapusPlankanRow[]> => {
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

  const peta: Record<string, LhkHapusPlankanDetailRow[]> = {};
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
} = useBrowse<LhkHapusPlankanRow>({
  menuId: "4",
  fetchApi: muatData,
  immediate: false, // dipanggil manual setelah mount
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const headers = [
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Kode Pabrik", key: "Kode_Pabrik", width: "120px" },
  { title: "Nama Pabrik", key: "Nama_Pabrik", width: "260px" },
];

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 30 },
];

const NUM = "#,##0.00";
const INT = "#,##0";
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
    header: "J Plangkan",
    key: "J_Plangkan",
    width: 12,
    align: "right",
    numFmt: INT,
  },
  { header: "J Meter", key: "J_Meter", width: 10, align: "right", numFmt: NUM },
  { header: "Ukuran", key: "Ukuran", width: 10, align: "right", numFmt: NUM },
  {
    header: "Jumlah Meter",
    key: "Jumlah_Meter",
    width: 14,
    align: "right",
    numFmt: NUM,
  },
  { header: "Rinso", key: "Rinso", width: 10, align: "right", numFmt: NUM },
  { header: "Porstek", key: "Porstek", width: 10, align: "right", numFmt: NUM },
  { header: "M46", key: "M46", width: 10, align: "right", numFmt: NUM },
  { header: "Kaporit", key: "Kaporit", width: 10, align: "right", numFmt: NUM },
  { header: "Caustik", key: "Caustik", width: 10, align: "right", numFmt: NUM },
  { header: "Keterangan", key: "Keterangan", width: 36 },
];

// Data master yang sedang tampil (ikut search + filter kolom BaseBrowse)
const dataTampil = (): LhkHapusPlankanRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- HANDLERS ---
const onAdd = () => {
  router.push({ name: "SpandukLhkHapusPlankanCreate" });
};

const onEdit = (item: LhkHapusPlankanRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({
    name: "SpandukLhkHapusPlankanEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: LhkHapusPlankanRow) => {
  try {
    await lhkService.remove(item.Nomor);
    toast.success(`LHK Hapus Plankan ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(lhkService.pesanError(e, "Gagal menghapus data."));
  }
};

const onPrint = () => {
  const item = selectedItem.value;
  if (!item) {
    return toast.warning("Pilih data LHK Hapus Plankan terlebih dahulu.");
  }
  const url = router.resolve({
    name: "SpandukLhkHapusPlankanPrint",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT ---
const exportMaster = () =>
  exportToExcel("LHK_Hapus_Plankan_Header", {
    columns: kolomMaster,
    getData: () =>
      dataTampil().map((r) => ({ ...r, Tanggal: formatTanggal(r.Tanggal) })),
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
        J_Plangkan: Number(r.J_Plangkan) || 0,
        J_Meter: Number(r.J_Meter) || 0,
        Ukuran: Number(r.Ukuran) || 0,
        Jumlah_Meter: Number(r.Jumlah_Meter) || 0,
        Rinso: Number(r.Rinso) || 0,
        Porstek: Number(r.Porstek) || 0,
        M46: Number(r.M46) || 0,
        Kaporit: Number(r.Kaporit) || 0,
        Caustik: Number(r.Caustik) || 0,
        Keterangan: r.Keterangan ?? "",
      });
    }
  }

  if (rows.length === 0) {
    return toast.warning("Tidak ada detail pada data yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Detail_LHK_Hapus_Plankan_${today}.xlsx`,
      "Detail LHK Hapus Plankan",
      kolomDetail,
      rows,
    );
    toast.success("Berhasil export detail LHK Hapus Plankan.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail LHK Hapus Plankan.");
  }
};

const numFmt = (v: number | null) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "0";
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Hapus Plankan"
    menu-id="4"
    storage-id="spanduk-lhk-hapus-plankan"
    :icon="IconEraser"
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

    <!-- Detail Expand -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">Detail SPK - {{ item.Nomor }}</div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="130">Nomor SPK</th>
              <th>Nama SPK</th>
              <th width="80" class="tr">Jml Order</th>
              <th width="70" class="tr">Panjang</th>
              <th width="70" class="tr">Lebar</th>
              <th width="80" class="tr">J Plangkan</th>
              <th width="70" class="tr">J Meter</th>
              <th width="70" class="tr">Ukuran</th>
              <th width="90" class="tr">Jml Meter</th>
              <th width="60" class="tr">Rinso</th>
              <th width="60" class="tr">Porstek</th>
              <th width="60" class="tr">M46</th>
              <th width="60" class="tr">Kaporit</th>
              <th width="60" class="tr">Caustik</th>
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
              <td class="tr">{{ numFmt(r.J_Plangkan) }}</td>
              <td class="tr">{{ numFmt(r.J_Meter) }}</td>
              <td class="tr">{{ numFmt(r.Ukuran) }}</td>
              <td class="tr text-blue-darken-2 font-weight-bold">
                {{ numFmt(r.Jumlah_Meter) }}
              </td>
              <td class="tr">{{ numFmt(r.Rinso) }}</td>
              <td class="tr">{{ numFmt(r.Porstek) }}</td>
              <td class="tr">{{ numFmt(r.M46) }}</td>
              <td class="tr">{{ numFmt(r.Kaporit) }}</td>
              <td class="tr">{{ numFmt(r.Caustik) }}</td>
              <td>{{ r.Keterangan || "-" }}</td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td colspan="15" class="text-center text-grey py-3 font-italic">
                Detail LHK Hapus Plankan tidak ditemukan.
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
