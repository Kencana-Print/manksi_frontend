<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import * as lhkService from "@/services/spanduk/lhk/lhkQuiringService";
import type {
  LhkQuiringRow,
  LhkQuiringDetailRow,
} from "@/services/spanduk/lhk/lhkQuiringService";
import { IconFlame, IconFileExport, IconPrinter } from "@tabler/icons-vue";
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
  J_Koli: number;
  J_Oven: number;
  J_Jemuran: number;
  J_Potong: number;
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
const detailMap = ref<Record<string, LhkQuiringDetailRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<LhkQuiringRow[]> => {
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

  const peta: Record<string, LhkQuiringDetailRow[]> = {};
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
} = useBrowse<LhkQuiringRow>({
  menuId: "1224",
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

const NUM = "#,##0.00";

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 30 },
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
  { header: "J Koli", key: "J_Koli", width: 10, align: "right", numFmt: NUM },
  { header: "J Oven", key: "J_Oven", width: 10, align: "right", numFmt: NUM },
  {
    header: "J Jemuran",
    key: "J_Jemuran",
    width: 12,
    align: "right",
    numFmt: NUM,
  },
  {
    header: "J Potong",
    key: "J_Potong",
    width: 12,
    align: "right",
    numFmt: NUM,
  },
];

// Data master yang sedang tampil (ikut search + filter kolom BaseBrowse)
const dataTampil = (): LhkQuiringRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- HANDLERS ---
const onAdd = () => {
  router.push({ name: "SpandukLhkQuiringCreate" });
};

const onEdit = (item: LhkQuiringRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({
    name: "SpandukLhkQuiringEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: LhkQuiringRow) => {
  try {
    await lhkService.remove(item.Nomor);
    toast.success(`LHK Quiring ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(lhkService.pesanError(e, "Gagal menghapus data."));
  }
};

const onPrint = () => {
  const item = selectedItem.value;
  if (!item) {
    return toast.warning("Pilih data LHK Quiring terlebih dahulu.");
  }
  const url = router.resolve({
    name: "SpandukLhkQuiringPrint",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT ---
const exportMaster = () =>
  exportToExcel("LHK_Quiring_Header", {
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
        J_Koli: Number(r.J_Koli) || 0,
        J_Oven: Number(r.J_Oven) || 0,
        J_Jemuran: Number(r.J_Jemuran) || 0,
        J_Potong: Number(r.J_Potong) || 0,
      });
    }
  }

  if (rows.length === 0) {
    return toast.warning("Tidak ada detail pada data yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Detail_LHK_Quiring_${today}.xlsx`,
      "Detail LHK Quiring",
      kolomDetail,
      rows,
    );
    toast.success("Berhasil export detail LHK Quiring.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail LHK Quiring.");
  }
};

const numFmt = (v: number | null) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "0";
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Quiring"
    menu-id="1224"
    storage-id="spanduk-lhk-quiring"
    :icon="IconFlame"
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
              <th width="70" class="tr">J Koli</th>
              <th width="70" class="tr">J Oven</th>
              <th width="80" class="tr">J Jemuran</th>
              <th width="80" class="tr">J Potong</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in detailMap[item.Nomor]" :key="r.Nomor_SPK">
              <td>{{ r.Nomor_SPK }}</td>
              <td class="font-weight-bold">{{ r.Nama_SPK }}</td>
              <td class="tr">{{ numFmt(r.Jumlah_Order) }}</td>
              <td class="tr">{{ numFmt(r.Panjang) }}</td>
              <td class="tr">{{ numFmt(r.Lebar) }}</td>
              <td class="tr">{{ numFmt(r.J_Koli) }}</td>
              <td class="tr">{{ numFmt(r.J_Oven) }}</td>
              <td class="tr">{{ numFmt(r.J_Jemuran) }}</td>
              <td class="tr">{{ numFmt(r.J_Potong) }}</td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td colspan="9" class="text-center text-grey py-3 font-italic">
                Detail LHK Quiring tidak ditemukan.
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
