<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import type { ExcelColumn } from "@/utils/excelExport";
import * as mpsService from "@/services/spanduk/mutasiProduksiSpandukService";
import type {
  MutasiProduksiSpandukRow,
  MutasiProduksiSpandukDetail,
  KolomDetail,
  NilaiDetail,
} from "@/services/spanduk/mutasiProduksiSpandukService";
import { IconArrowsExchange, IconPrinter } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";

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

// --- DETAIL: dimuat per baris saat di-expand, lalu disimpan ---
const detailMap = ref<Record<string, MutasiProduksiSpandukDetail>>({});
const detailGagal = ref<Record<string, string>>({});
const expandedRows = ref<unknown[]>([]);
const sedangMuat = new Set<string>();

const kunciBaris = (e: unknown): string | null => {
  if (typeof e === "string") {
    return e;
  }
  if (e && typeof e === "object" && "Nomor" in e) {
    return String((e as { Nomor: unknown }).Nomor);
  }
  return null;
};

const muatDetail = async (nomor: string) => {
  if (detailMap.value[nomor] || sedangMuat.has(nomor)) {
    return;
  }
  sedangMuat.add(nomor);
  try {
    detailMap.value[nomor] = await mpsService.getDetail(nomor);
    delete detailGagal.value[nomor];
  } catch (e) {
    detailGagal.value[nomor] = mpsService.pesanError(e, "Gagal memuat detail.");
  } finally {
    sedangMuat.delete(nomor);
  }
};

watch(expandedRows, (baru) => {
  for (const e of baru) {
    const kunci = kunciBaris(e);
    if (kunci) {
      muatDetail(kunci);
    }
  }
});

const kolomDari = (nomor: string): KolomDetail[] =>
  detailMap.value[nomor]?.Kolom ?? [];

const barisDari = (nomor: string): Record<string, NilaiDetail>[] =>
  detailMap.value[nomor]?.Baris ?? [];

const tampil = (v: NilaiDetail | undefined): string => {
  if (v === null || v === undefined || v === "") {
    return "-";
  }
  if (typeof v === "number") {
    return v.toLocaleString("id-ID", { maximumFractionDigits: 2 });
  }
  return v;
};

const muatData = async (): Promise<MutasiProduksiSpandukRow[]> => {
  const { dtAwal, dtAkhir } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const master = await mpsService.getBrowse(dtAwal, dtAkhir);
  detailMap.value = {};
  detailGagal.value = {};
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
  fetchData,
  exportToExcel,
} = useBrowse<MutasiProduksiSpandukRow>({
  menuId: "4",
  fetchApi: muatData,
  immediate: false, // dipanggil manual setelah mount
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const headers = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Lokasi", key: "Nama_Pabrik", width: "150px" },
  { title: "Lini Asal", key: "Nama_Lini_Asal", width: "120px" },
  { title: "Lini Tujuan", key: "Nama_Lini_Tujuan", width: "120px" },
  { title: "Nomor LHK", key: "Nomor_LHK", width: "150px" },
  { title: "Nomor SPK", key: "Nomor_SPK", width: "140px" },
  { title: "Nama SPK", key: "Nama_SPK", width: "260px" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
];

const kolomMaster: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 26 },
  { header: "Lini Asal", key: "Nama_Lini_Asal", width: 16 },
  { header: "Lini Tujuan", key: "Nama_Lini_Tujuan", width: 16 },
  { header: "Nomor LHK", key: "Nomor_LHK", width: 20 },
  { header: "Nomor SPK", key: "Nomor_SPK", width: 20 },
  { header: "Nama SPK", key: "Nama_SPK", width: 36 },
  { header: "Keterangan", key: "Keterangan", width: 36 },
];

// Data yang sedang tampil (ikut search + filter kolom BaseBrowse)
const dataTampil = (): MutasiProduksiSpandukRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- HANDLERS ---
const onAdd = () => {
  router.push({ name: "SpandukMutasiProduksiCreate" });
};

const onEdit = (item: MutasiProduksiSpandukRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({
    name: "SpandukMutasiProduksiEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: MutasiProduksiSpandukRow) => {
  try {
    await mpsService.remove(item.Nomor);
    toast.success(`Mutasi produksi ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(mpsService.pesanError(e, "Gagal menghapus data."));
  }
};

const onCetak = () => {
  const item = selected.value?.[0];
  if (!item?.Nomor) {
    toast.warning("Pilih data mutasi produksi terlebih dahulu.");
    return;
  }
  const url = router.resolve({
    name: "SpandukMutasiProduksiPrint",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT ---
const exportMaster = () =>
  exportToExcel("Mutasi_Produksi_Spanduk", {
    columns: kolomMaster,
    getData: () =>
      dataTampil().map((r) => ({ ...r, Tanggal: formatTanggal(r.Tanggal) })),
  });
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Mutasi Produksi Spanduk"
    menu-id="4"
    storage-id="spanduk-mutasi-produksi"
    :icon="IconArrowsExchange"
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

    <!-- Detail Expand: baris SPK itu di LHK asal -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          Detail {{ item.Nama_Lini_Asal }} - {{ item.Nomor_LHK }} /
          {{ item.Nomor_SPK }}
        </div>
        <div v-if="detailGagal[item.Nomor]" class="text-error py-2">
          {{ detailGagal[item.Nomor] }}
        </div>
        <div v-else-if="!detailMap[item.Nomor]" class="text-grey py-2">
          Memuat detail...
        </div>
        <table v-else class="detail-table">
          <thead>
            <tr>
              <th v-for="k in kolomDari(item.Nomor)" :key="k.Key">
                {{ k.Label }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(b, i) in barisDari(item.Nomor)" :key="i">
              <td
                v-for="k in kolomDari(item.Nomor)"
                :key="k.Key"
                :class="{ tr: typeof b[k.Key] === 'number' }"
              >
                {{ tampil(b[k.Key]) }}
              </td>
            </tr>
            <tr v-if="barisDari(item.Nomor).length === 0">
              <td
                :colspan="Math.max(kolomDari(item.Nomor).length, 1)"
                class="text-center text-grey py-3 font-italic"
              >
                Baris SPK ini tidak ditemukan di LHK asal.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template #extra-actions="{ selected: terpilih }">
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="terpilih.length === 0"
        @click="onCetak"
      >
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
</style>
