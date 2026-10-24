<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import * as lhkService from "@/services/spanduk/lhk/lhkProofService";
import type {
  LhkProofRow,
  LhkProofDetailRow,
  LhkProofResepRow,
} from "@/services/spanduk/lhk/lhkProofService";
import { IconFileCheck, IconPrinter, IconFileExport } from "@tabler/icons-vue";
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
  J_Proof: number;
  J_Meter: number;
  Warna1: string;
  Warna2: string;
  Warna3: string;
  Warna4: string;
  Warna5: string;
  Warna6: string;
  Warna7: string;
  Warna8: string;
  Warna9: string;
  Warna10: string;
}

interface ExportResepRow {
  Nomor: string;
  Tanggal: string;
  Kode_Pabrik: string;
  Nama_Pabrik: string;
  Kode: number;
  Nama: string;
  Satuan: string;
  Qty_Resep: number;
  Qty_Actual: number;
  Selisih: number;
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
const detailMap = ref<Record<string, LhkProofDetailRow[]>>({});
const resepMap = ref<Record<string, LhkProofResepRow[]>>({});
const expandedRows = ref<unknown[]>([]);

const muatData = async (): Promise<LhkProofRow[]> => {
  const { dtAwal, dtAkhir } = filterState.value;
  if (!dtAwal || !dtAkhir) {
    toast.warning("Periode tanggal harus diisi.");
    return [];
  }
  if (dtAwal > dtAkhir) {
    toast.warning("Tanggal awal tidak boleh lebih besar dari tanggal akhir.");
    return [];
  }

  const [master, detail, resep] = await Promise.all([
    lhkService.getBrowse(dtAwal, dtAkhir),
    lhkService.getDetail(dtAwal, dtAkhir),
    lhkService.getResep(dtAwal, dtAkhir),
  ]);

  const peta: Record<string, LhkProofDetailRow[]> = {};
  for (const row of detail) {
    (peta[row.Nomor] ??= []).push(row);
  }
  detailMap.value = peta;

  const petaResep: Record<string, LhkProofResepRow[]> = {};
  for (const row of resep) {
    (petaResep[row.Nomor] ??= []).push(row);
  }
  resepMap.value = petaResep;
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
} = useBrowse<LhkProofRow>({
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
const QTY4 = "#,##0.0000";

const kolomResep: ExcelColumn[] = [
  { header: "Nomor", key: "Nomor", width: 20 },
  { header: "Tanggal", key: "Tanggal", width: 14, align: "center" },
  { header: "Kode Pabrik", key: "Kode_Pabrik", width: 14 },
  { header: "Nama Pabrik", key: "Nama_Pabrik", width: 28 },
  { header: "Kode Bahan", key: "Kode", width: 12 },
  { header: "Nama Bahan", key: "Nama", width: 34 },
  { header: "Satuan", key: "Satuan", width: 10 },
  {
    header: "Resep",
    key: "Qty_Resep",
    width: 14,
    align: "right",
    numFmt: QTY4,
  },
  {
    header: "Actual",
    key: "Qty_Actual",
    width: 14,
    align: "right",
    numFmt: QTY4,
  },
  {
    header: "Selisih",
    key: "Selisih",
    width: 14,
    align: "right",
    numFmt: QTY4,
  },
];

const fmtQty = (v: number | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 4 });

const selisih = (r: LhkProofResepRow): number =>
  Math.round((r.Qty_Actual - r.Qty_Resep) * 10000) / 10000;
const warnaDari = (r: LhkProofDetailRow): string[] =>
  [r.U1, r.U2, r.U3, r.U4, r.U5, r.U6, r.U7, r.U8, r.U9, r.U10].map((v) =>
    (v ?? "").trim(),
  );
// Jumlah kolom warna yang ditampilkan di expand: sampai warna terisi paling akhir
const jumlahKolomWarna = (nomor: string): number => {
  const terjauh = (detailMap.value[nomor] ?? []).reduce((mx, r) => {
    const idx = warnaDari(r).reduce((a, w, i) => (w !== "" ? i + 1 : a), 0);
    return Math.max(mx, idx);
  }, 0);
  return Math.max(1, terjauh);
};

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
  { header: "J Proof", key: "J_Proof", width: 10, align: "right", numFmt: INT },
  { header: "J Meter", key: "J_Meter", width: 10, align: "right", numFmt: NUM },
  ...Array.from({ length: 10 }, (_, i) => ({
    header: `Warna ${i + 1}`,
    key: `Warna${i + 1}`,
    width: 14,
  })),
];

// Data master yang sedang tampil (ikut search + filter kolom BaseBrowse)
const dataTampil = (): LhkProofRow[] =>
  baseBrowseRef.value?.getFilteredItems() ?? items.value ?? [];

onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);

// --- HANDLERS ---
const onAdd = () => {
  router.push({ name: "SpandukLhkProofCreate" });
};

const onEdit = (item: LhkProofRow) => {
  if (!item?.Nomor) {
    return;
  }
  router.push({
    name: "SpandukLhkProofEdit",
    params: { nomor: item.Nomor },
  });
};

const onDelete = async (item: LhkProofRow) => {
  try {
    await lhkService.remove(item.Nomor);
    toast.success(`LHK Proof ${item.Nomor} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(lhkService.pesanError(e, "Gagal menghapus data."));
  }
};

const onPrint = () => {
  const item = selectedItem.value;
  if (!item) {
    return toast.warning("Pilih data LHK Proof terlebih dahulu.");
  }
  const url = router.resolve({
    name: "SpandukLhkProofPrint",
    params: { nomor: item.Nomor },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT ---
const exportMaster = () =>
  exportToExcel("LHK_Proof_Header", {
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
        J_Proof: Number(r.J_Proof) || 0,
        J_Meter: Number(r.J_Meter) || 0,
        Warna1: warnaDari(r)[0],
        Warna2: warnaDari(r)[1],
        Warna3: warnaDari(r)[2],
        Warna4: warnaDari(r)[3],
        Warna5: warnaDari(r)[4],
        Warna6: warnaDari(r)[5],
        Warna7: warnaDari(r)[6],
        Warna8: warnaDari(r)[7],
        Warna9: warnaDari(r)[8],
        Warna10: warnaDari(r)[9],
      });
    }
  }

  if (rows.length === 0) {
    return toast.warning("Tidak ada detail pada data yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Detail_LHK_Proof_${today}.xlsx`,
      "Detail LHK Proof",
      kolomDetail,
      rows,
    );
    toast.success("Berhasil export detail LHK Proof.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor detail LHK Proof.");
  }
};

// Resep & Actual per dokumen, hanya dari LHK yang sedang tampil di grid
const exportResep = async () => {
  if (!canExport.value) {
    return toast.error("Akses ditolak: Anda tidak memiliki izin untuk export.");
  }

  const master = dataTampil();
  if (master.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }

  const rows: ExportResepRow[] = [];
  for (const item of master) {
    for (const r of resepMap.value[item.Nomor] ?? []) {
      rows.push({
        Nomor: item.Nomor,
        Tanggal: formatTanggal(item.Tanggal),
        Kode_Pabrik: item.Kode_Pabrik ?? "",
        Nama_Pabrik: item.Nama_Pabrik ?? "",
        Kode: r.Kode,
        Nama: r.Nama,
        Satuan: r.Satuan,
        Qty_Resep: r.Qty_Resep,
        Qty_Actual: r.Qty_Actual,
        Selisih: selisih(r),
      });
    }
  }

  if (rows.length === 0) {
    return toast.warning("Tidak ada data resep pada LHK yang tampil.");
  }

  try {
    await exportExcelSingle(
      `Export_Resep_LHK_Proof_${today}.xlsx`,
      "Resep LHK Proof",
      kolomResep,
      rows,
    );
    toast.success("Berhasil export resep LHK Proof.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat mengekspor resep LHK Proof.");
  }
};

const numFmt = (v: number | null) =>
  v ? Number(v).toLocaleString("id-ID", { maximumFractionDigits: 2 }) : "0";
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="LHK Proof"
    menu-id="4"
    storage-id="spanduk-lhk-proof"
    :icon="IconFileCheck"
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
              <th width="150">Nomor SPK</th>
              <th>Nama SPK</th>
              <th width="90" class="tr">Jml Order</th>
              <th width="80" class="tr">Panjang</th>
              <th width="80" class="tr">Lebar</th>
              <th width="90" class="tr">J Plangkan</th>
              <th width="80" class="tr">J Proof</th>
              <th width="80" class="tr">J Meter</th>
              <th v-for="i in jumlahKolomWarna(item.Nomor)" :key="i" width="90">
                Warna {{ i }}
              </th>
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
              <td class="tr text-blue-darken-2 font-weight-bold">
                {{ numFmt(r.J_Proof) }}
              </td>
              <td class="tr">{{ numFmt(r.J_Meter) }}</td>
              <td v-for="i in jumlahKolomWarna(item.Nomor)" :key="i">
                {{ warnaDari(r)[i - 1] }}
              </td>
            </tr>
            <tr v-if="!detailMap[item.Nomor]?.length">
              <td
                :colspan="8 + jumlahKolomWarna(item.Nomor)"
                class="text-center text-grey py-3 font-italic"
              ></td>
            </tr>
          </tbody>
        </table>

        <div v-if="resepMap[item.Nomor]?.length" class="mt-3">
          <div class="expand-title mb-2">
            Resep &amp; Actual Pemakaian Obat - {{ item.Nomor }}
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th>Nama Bahan</th>
                <th width="70">Satuan</th>
                <th width="110" class="tr">Resep</th>
                <th width="110" class="tr">Actual</th>
                <th width="110" class="tr">Selisih</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in resepMap[item.Nomor]" :key="r.Kode">
                <td>{{ r.Nama }}</td>
                <td>{{ r.Satuan }}</td>
                <td class="tr">{{ fmtQty(r.Qty_Resep) }}</td>
                <td class="tr font-weight-bold">{{ fmtQty(r.Qty_Actual) }}</td>
                <td
                  class="tr"
                  :class="selisih(r) > 0 ? 'text-red-darken-2' : ''"
                >
                  {{ fmtQty(selisih(r)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
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
      <v-btn size="small" color="teal-darken-1" @click="exportResep">
        <template #prepend><IconFileExport :size="15" /></template>Export Resep
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
