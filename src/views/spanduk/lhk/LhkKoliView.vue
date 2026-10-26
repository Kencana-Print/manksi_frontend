<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import * as lhkService from "@/services/spanduk/lhk/lhkKoliService";
import type {
  LhkKoliRow,
  LhkKoliDetailRow,
} from "@/services/spanduk/lhk/lhkKoliService";
import {
  IconBox,
  IconFileExport,
  IconQrcode,
  IconPrinter,
} from "@tabler/icons-vue";
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
}

const toast = useToast();
const router = useRouter();

const d = new Date();
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const firstDay = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
const today = toLocalDateStr(d);

const filterState = ref({ dtAwal: firstDay, dtAkhir: today });

const detailMap = ref<Record<string, LhkKoliDetailRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<LhkKoliRow[]> => {
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
  const peta: Record<string, LhkKoliDetailRow[]> = {};
  for (const row of detail) {
    (peta[row.Nomor] ??= []).push(row);
  }
  detailMap.value = peta;
  expandedRows.value = [];
  return master;
};

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
} = useBrowse<LhkKoliRow>({
  menuId: "4",
  fetchApi: muatData,
  immediate: false,
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const headers = [
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Kode Pabrik", key: "Kode_Pabrik", width: "120px" },
  { title: "Nama Pabrik", key: "Nama_Pabrik", width: "240px" },
  { title: "Jml SPK", key: "Jml_SPK", width: "90px", align: "end" },
  { title: "Total Koli", key: "Total_Koli", width: "100px", align: "end" },
];

const NUM = "#,##0.00";
const INT = "#,##0";

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 28 },
  { header: "Jml SPK", key: "Jml_SPK", width: 10, align: "right", numFmt: INT },
  {
    header: "Total Koli",
    key: "Total_Koli",
    width: 12,
    align: "right",
    numFmt: INT,
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
  { header: "J Koli", key: "J_Koli", width: 10, align: "right", numFmt: INT },
];

const dataTampil = (): LhkKoliRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

const onAdd = () => {
  router.push({ name: "SpandukLhkKoliCreate" });
};

const onEdit = (item: LhkKoliRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({ name: "SpandukLhkKoliEdit", params: { nomor: item.Nomor } });
};

const onDelete = async (item: LhkKoliRow) => {
  try {
    await lhkService.remove(item.Nomor);
    toast.success(`LHK Koli ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(lhkService.pesanError(e, "Gagal menghapus data."));
  }
};

// Cetak label QR per koli
const onPrint = () => {
  const item = selectedItem.value;
  if (!item) {
    return toast.warning("Pilih data LHK Koli terlebih dahulu.");
  }
  const url = router.resolve({
    name: "SpandukLhkKoliPrint",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

// Cetak lembar LHK (arsip, tanda tangan)
const onPrintLembar = () => {
  const item = selectedItem.value;
  if (!item) {
    return toast.warning("Pilih data LHK Koli terlebih dahulu.");
  }
  const url = router.resolve({
    name: "SpandukLhkKoliLembar",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

const exportMaster = () =>
  exportToExcel("LHK_Koli_Header", {
    columns: kolomMaster,
    getData: () =>
      dataTampil().map((r) => ({ ...r, Tanggal: formatTanggal(r.Tanggal) })),
  });

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
      });
    }
  }
  if (rows.length === 0) {
    return toast.warning("Tidak ada detail pada data yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Detail_LHK_Koli_${today}.xlsx`,
      "Detail LHK Koli",
      kolomDetail,
      rows,
    );
    toast.success("Berhasil export detail LHK Koli.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail LHK Koli.");
  }
};

const numFmt = (v: number | null) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "0";
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Koli"
    menu-id="4"
    storage-id="spanduk-lhk-koli"
    :icon="IconBox"
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

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">Detail SPK - {{ item.Nomor }}</div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="150">Nomor SPK</th>
              <th>Nama SPK</th>
              <th width="90" class="tr">Jml Order</th>
              <th width="80" class="tr">Panjang</th>
              <th width="80" class="tr">Lebar</th>
              <th width="80" class="tr">J Koli</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in detailMap[item.Nomor]" :key="r.Nomor_SPK">
              <td>{{ r.Nomor_SPK }}</td>
              <td class="font-weight-bold">{{ r.Nama_SPK }}</td>
              <td class="tr">{{ numFmt(r.Jumlah_Order) }}</td>
              <td class="tr">{{ numFmt(r.Panjang) }}</td>
              <td class="tr">{{ numFmt(r.Lebar) }}</td>
              <td class="tr font-weight-bold">{{ numFmt(r.J_Koli) }}</td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td colspan="6" class="text-center text-grey py-3 font-italic">
                Detail LHK Koli tidak ditemukan.
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
        <template #prepend><IconQrcode :size="15" /></template>Cetak Label QR
      </v-btn>
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrintLembar"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak LHK
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
