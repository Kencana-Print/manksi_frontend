<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  cetakBarcodeKoliService,
  type CetakBarcodeKoliRow,
  type CetakBarcodeKoliDetailRow,
} from "@/services/garmen/cetakBarcodeKoliService";
import { IconQrcode, IconListDetails } from "@tabler/icons-vue";
import { formatTanggalSingkat, toExcelDate } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const toast = useToast();
const router = useRouter();
const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

interface HeaderDef {
  title: string;
  key: string;
  width: string;
  align?: "center" | "end";
  fixed?: boolean;
}

type StatusTerima = "Belum diterima" | "Sebagian" | "Lengkap" | "-";
type BrowseRow = CetakBarcodeKoliRow & { StatusTerima: StatusTerima };

const hitungStatusTerima = (r: CetakBarcodeKoliRow): StatusTerima => {
  const aktif = Number(r.KoliAktif) || 0;
  const terima = Number(r.KoliDiterima) || 0;
  if (aktif === 0) return "-";
  if (terima === 0) return "Belum diterima";
  return terima >= aktif ? "Lengkap" : "Sebagian";
};

// Normalisasi item slot BaseBrowse (kadang dibungkus .raw) tanpa any
const rowOf = (item: unknown): BrowseRow =>
  ((item as { raw?: BrowseRow }).raw ?? item) as BrowseRow;

// --- Filter ---
const getToday = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const filterState = ref<Record<string, unknown>>({});
const startDate = ref(getToday());
const endDate = ref(getToday());

const { items, isLoading, selected, canExport, selectedItem, fetchData } =
  useBrowse({
    menuId: "188",
    fetchApi: async () => {
      const res = await cetakBarcodeKoliService.getBrowse({
        tglAwal: startDate.value,
        tglAkhir: endDate.value,
      });
      detailCache.value = {};
      return res.data.data.map(
        (r): BrowseRow => ({ ...r, StatusTerima: hitungStatusTerima(r) }),
      );
    },
    immediate: false,
  });

watch([startDate, endDate], () => fetchData());
onMounted(() => fetchData());

const selectedRow = computed(
  () => (selectedItem.value ?? null) as BrowseRow | null,
);

// --- Headers ---
const headers: HeaderDef[] = [
  { title: "Nomor", key: "Nomor", width: "140px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Cab", key: "Cab", width: "60px", align: "center" },
  { title: "No. STBJ", key: "StbjNomor", width: "150px" },
  { title: "Koli Aktif", key: "KoliAktif", width: "85px", align: "end" },
  { title: "Diterima FG", key: "KoliDiterima", width: "95px", align: "end" },
  { title: "Void", key: "KoliVoid", width: "70px", align: "end" },
  {
    title: "Penerimaan FG",
    key: "StatusTerima",
    width: "120px",
    align: "center",
  },
  { title: "Dibuat", key: "UserNama", width: "130px" },
];

const numFmt = (v: number | string | null | undefined) =>
  v ? Number(v).toLocaleString("id-ID") : "0";

const sumBy = (rows: BrowseRow[], key: keyof CetakBarcodeKoliRow) =>
  numFmt(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));

const summaryFormatters = {
  StbjNomor: () => "TOTAL :",
  KoliAktif: (rows: BrowseRow[]) => sumBy(rows, "KoliAktif"),
  KoliDiterima: (rows: BrowseRow[]) => sumBy(rows, "KoliDiterima"),
  KoliVoid: (rows: BrowseRow[]) => sumBy(rows, "KoliVoid"),
};

// --- Expand: detail per SPK, di-fetch saat baris dibuka ---
const detailCache = ref<Record<string, CetakBarcodeKoliDetailRow[]>>({});
const detailLoading = ref<Record<string, boolean>>({});
const expandedRows = ref<unknown[]>([]);

const nomorDari = (v: unknown): string =>
  typeof v === "string" ? v : ((v as { Nomor?: string }).Nomor ?? "");

const muatDetail = async (nomor: string) => {
  if (!nomor || detailCache.value[nomor] || detailLoading.value[nomor]) return;
  detailLoading.value = { ...detailLoading.value, [nomor]: true };
  try {
    const res = await cetakBarcodeKoliService.getDetail(nomor);
    detailCache.value = { ...detailCache.value, [nomor]: res.data.data };
  } catch (e) {
    console.error(e);
    toast.error("Gagal memuat rincian dokumen.");
  } finally {
    detailLoading.value = { ...detailLoading.value, [nomor]: false };
  }
};

const onUpdateExpanded = (val: unknown[]) => {
  expandedRows.value = val;
  val.forEach((v) => muatDetail(nomorDari(v)));
};

// --- Navigasi (dokumen dibuat otomatis saat simpan STBJ, tidak ada Tambah) ---
const BASE_ROUTE = "/garmen/bahan-jadi/cetak-barcode-koli";
const onDetail = () => {
  if (!selectedRow.value) return;
  router.push(
    `${BASE_ROUTE}/detail/${encodeURIComponent(selectedRow.value.Nomor)}`,
  );
};

// --- Export ---
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport = (baseBrowseRef.value?.getFilteredItems?.() ??
    items.value ??
    []) as BrowseRow[];

  if (dataToExport.length === 0) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }

  isExporting.value = true;
  try {
    const columns: ExcelColumn[] = headers.map((h) => ({
      header: h.title,
      key: h.key,
      width: Math.max(10, Math.round(parseInt(h.width) / 7)),
      align: h.align ?? "left",
      numFmt:
        h.key === "Tanggal"
          ? "dd/mm/yyyy"
          : ["KoliAktif", "KoliDiterima", "KoliVoid"].includes(h.key)
            ? "#,##0"
            : undefined,
    }));

    const rows = dataToExport.map((it) => {
      const row: Record<string, string | number | Date | null> = {};
      for (const c of columns) {
        row[c.key] =
          c.key === "Tanggal"
            ? toExcelDate(it.Tanggal)
            : (it[c.key as keyof BrowseRow] ?? "");
      }
      return row;
    });

    const periodeLabel = `Periode: ${formatTanggalSingkat(startDate.value)} s/d ${formatTanggalSingkat(endDate.value)}`;
    await exportExcelSingle(
      `Cetak_Barcode_Koli_${startDate.value}_${endDate.value}.xlsx`,
      "Cetak Barcode Koli",
      columns,
      rows,
      `Laporan Cetak Barcode Koli  |  ${periodeLabel}`,
    );
    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="Cetak Barcode Koli"
    menu-id="188"
    :icon="IconQrcode"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    item-value="Nomor"
    show-expand
    :expanded="expandedRows"
    :summary-columns="['KoliAktif', 'KoliDiterima', 'KoliVoid']"
    :summary-formatters="summaryFormatters"
    @update:expanded="onUpdateExpanded"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <input type="date" v-model="startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="endDate" class="f-date" />
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="!selectedRow"
        @click="onDetail"
      >
        <template #prepend><IconListDetails :size="15" /></template>Detail /
        Cetak Ulang
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggalSingkat(rowOf(item).Tanggal) }}
    </template>

    <template #item.KoliAktif="{ item }">
      {{ numFmt(rowOf(item).KoliAktif) }}
    </template>

    <template #item.KoliDiterima="{ item }">
      {{ numFmt(rowOf(item).KoliDiterima) }}
    </template>

    <template #item.KoliVoid="{ item }">
      <span :class="{ 'text-grey': !rowOf(item).KoliVoid }">
        {{ numFmt(rowOf(item).KoliVoid) }}
      </span>
    </template>

    <template #item.StatusTerima="{ item }">
      <span
        v-if="rowOf(item).StatusTerima !== '-'"
        class="kk-badge"
        :class="{
          'badge-grey': rowOf(item).StatusTerima === 'Belum diterima',
          'badge-blue': rowOf(item).StatusTerima === 'Sebagian',
          'badge-green': rowOf(item).StatusTerima === 'Lengkap',
        }"
      >
        {{ rowOf(item).StatusTerima }}
      </span>
      <span v-else class="text-grey">-</span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          Rincian per SPK - {{ rowOf(item).Nomor }}
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="190">No. SPK</th>
              <th>Nama SPK</th>
              <th width="80" class="tr">Aktif</th>
              <th width="90" class="tr">Diterima</th>
              <th width="70" class="tr">Void</th>
              <th width="110" class="tr">Total Cetak</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in detailCache[rowOf(item).Nomor] || []" :key="d.Spk">
              <td>{{ d.Spk }}</td>
              <td>{{ d.NamaSpk }}</td>
              <td class="tr">{{ numFmt(d.Aktif) }}</td>
              <td class="tr">{{ numFmt(d.Diterima) }}</td>
              <td class="tr">{{ numFmt(d.Void) }}</td>
              <td class="tr">{{ numFmt(d.TotalCetak) }}</td>
            </tr>
            <tr v-if="detailLoading[rowOf(item).Nomor]">
              <td colspan="6" class="text-center text-grey py-4">
                Memuat rincian...
              </td>
            </tr>
            <tr v-else-if="!(detailCache[rowOf(item).Nomor] || []).length">
              <td colspan="6" class="text-center text-grey py-4 font-italic">
                Data rincian tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
}

.kk-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.badge-grey {
  background: #f5f5f5;
  color: #757575;
}
.badge-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.badge-green {
  background: #e8f5e9;
  color: #2e7d32;
}

.expand-wrap {
  padding: 10px 10px 10px 50px;
  background: #eceff1;
}
.expand-title {
  font-size: 11px;
  font-weight: 700;
  color: #37474f;
}
.detail-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 10px;
  font-size: 11px;
}
.detail-table td {
  padding: 4px 10px;
  border-bottom: 1px solid #eee;
  font-size: 11px;
}
.tr {
  text-align: right !important;
}
</style>
