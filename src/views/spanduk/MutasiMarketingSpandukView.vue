<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import * as mmService from "@/services/spanduk/mutasiMarketingSpandukService";
import type {
  MutasiMarketingRow,
  MutasiMarketingDetailRow,
} from "@/services/spanduk/mutasiMarketingSpandukService";
import type { ExcelColumn } from "@/utils/excelExport";
import { IconTruckDelivery, IconPrinter } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

const toast = useToast();
const router = useRouter();

// --- FILTER: default awal bulan s.d. hari ini ---
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const d = new Date();
const filterState = ref({
  dtAwal: toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1)),
  dtAkhir: toLocalDateStr(d),
});

// --- DETAIL: dimuat sekali per periode, dikelompokkan per nomor dokumen ---
const detailMap = ref<Record<string, MutasiMarketingDetailRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<MutasiMarketingRow[]> => {
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
    mmService.getBrowse(dtAwal, dtAkhir),
    mmService.getDetail(dtAwal, dtAkhir),
  ]);

  const peta: Record<string, MutasiMarketingDetailRow[]> = {};
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
  fetchData,
  exportToExcel,
} = useBrowse<MutasiMarketingRow>({
  menuId: "1327",
  fetchApi: muatData,
  immediate: false,
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const headers = [
  { title: "Nomor", key: "Nomor", width: "170px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Lokasi", key: "Lokasi", width: "80px", align: "center" },
  { title: "MO", key: "MO", width: "220px" },
  { title: "Jml MAP", key: "Jumlah_MAP", width: "90px", align: "end" },
  { title: "Total Qty", key: "Total_Qty", width: "100px", align: "end" },
  { title: "Diterima", key: "Diterima", width: "100px", align: "center" },
  { title: "Keterangan", key: "Keterangan", width: "260px" },
];

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Lokasi", key: "Lokasi", width: 10, align: "center" },
  { header: "MO", key: "MO", width: 28 },
  { header: "Jml MAP", key: "Jumlah_MAP", width: 10, align: "right" },
  {
    header: "Total Qty",
    key: "Total_Qty",
    width: 12,
    align: "right",
    numFmt: "#,##0.##",
  },
  { header: "Diterima", key: "Diterima", width: 12, align: "center" },
  { header: "Keterangan", key: "Keterangan", width: 40 },
];

const dataTampil = (): MutasiMarketingRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

const statusDiterima = (r: MutasiMarketingRow) =>
  `${r.Jumlah_Diterima}/${r.Jumlah_MAP}`;

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

const onAdd = () => {
  router.push({ name: "SpandukMutasiMarketingCreate" });
};

const onEdit = (item: MutasiMarketingRow) => {
  router.push({
    name: "SpandukMutasiMarketingEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: MutasiMarketingRow) => {
  try {
    await mmService.remove(item.Nomor);
    toast.success(`Mutasi Marketing ${item.Nomor} berhasil dihapus.`);
    selected.value = [];
    await fetchData();
  } catch (e) {
    toast.error(mmService.pesanError(e, "Gagal menghapus."));
  }
};

// Nomor dokumen yang dipilih (selected bisa berisi objek baris atau kunci Nomor)
const nomorTerpilih = (): string => {
  const first = (selected.value as unknown[])[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object" && "Nomor" in first) {
    return String((first as { Nomor: string }).Nomor);
  }
  return "";
};

const onCetak = () => {
  const nomor = nomorTerpilih();
  if (!nomor) {
    toast.warning("Pilih dokumen yang akan dicetak.");
    return;
  }
  window.open(
    `/spanduk/mutasi-marketing/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

const onExport = () =>
  exportToExcel("Mutasi_Marketing", {
    columns: kolomMaster,
    getData: () =>
      dataTampil().map((r) => ({
        ...r,
        Tanggal: formatTanggal(r.Tanggal),
        Diterima: statusDiterima(r),
      })),
  });

const numFmt = (v: number | null) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "0";
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Mutasi Marketing"
    menu-id="1327"
    storage-id="spanduk-mutasi-marketing"
    :icon="IconTruckDelivery"
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
    @export="onExport"
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

    <template #item.Total_Qty="{ item }">
      {{ numFmt(item.Total_Qty) }}
    </template>

    <template #item.Diterima="{ item }">
      {{ statusDiterima(item) }}
    </template>

    <!-- Detail Expand -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">Detail MAP - {{ item.Nomor }}</div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="170">Nomor MAP</th>
              <th>Nama Pekerjaan</th>
              <th width="90" class="tr">Qty</th>
              <th width="220">MO</th>
              <th width="110" class="tc">Diterima</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in detailMap[item.Nomor]" :key="r.Nomor_MAP">
              <td>{{ r.Nomor_MAP }}</td>
              <td class="font-weight-bold">{{ r.Nama_MAP }}</td>
              <td class="tr">{{ numFmt(r.Qty) }}</td>
              <td>{{ r.MO }}</td>
              <td class="tc">
                {{ r.Tgl_Diterima ? formatTanggal(r.Tgl_Diterima) : "-" }}
              </td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td colspan="5" class="text-center text-grey py-3 font-italic">
                Detail Mutasi Marketing tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #extra-actions>
      <v-btn size="small" color="primary" @click="onCetak">
        <template #prepend><IconPrinter :size="15" /></template>Cetak
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
.tc {
  text-align: center !important;
}
</style>
