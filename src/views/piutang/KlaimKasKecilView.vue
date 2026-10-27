<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import axios from "axios";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { useRouter } from "vue-router";
import {
  klaimKasKecilService,
  type KlaimKasKecilRow,
  type KlaimKasKecilDetailRow,
} from "@/services/piutang/klaimKasKecilService";
import { IconCashBanknote, IconBan } from "@tabler/icons-vue";
import { formatTanggal } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import api from "@/services/api";

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

interface CabangRaw {
  pab_kode?: string;
  Kode?: string;
  pab_nama?: string;
  Nama?: string;
}
interface CabangOption {
  kode: string;
  nama: string;
}

const pesanError = (e: unknown, fallback: string): string =>
  axios.isAxiosError<{ message?: string }>(e)
    ? (e.response?.data?.message ?? fallback)
    : fallback;

// Normalisasi item slot BaseBrowse (kadang dibungkus .raw) tanpa any
const rowOf = (item: unknown): KlaimKasKecilRow =>
  ((item as { raw?: KlaimKasKecilRow }).raw ?? item) as KlaimKasKecilRow;

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
const cabang = ref("HO-");
const listCabang = ref<CabangOption[]>([]);

// Klaim saat ini hanya dibuat oleh P04
const ALLOWED_CABANG = ["P04"];

const loadCabang = async () => {
  try {
    const res = await api.get<{ data: { items?: CabangRaw[] } | CabangRaw[] }>(
      "/lookups/cabang-pabrik",
    );
    const raw = res.data.data;
    const items = Array.isArray(raw) ? raw : (raw.items ?? []);
    listCabang.value = items
      .map((c) => ({
        kode: c.pab_kode ?? c.Kode ?? "",
        nama: c.pab_nama ?? c.Nama ?? "",
      }))
      .filter((c) => ALLOWED_CABANG.includes(c.kode));
  } catch (e) {
    console.error("Gagal load cabang", e);
  }
};

// --- Detail BKK per klaim (di-fetch bareng browse, dikelompokkan di client) ---
const detailCache = ref<Record<string, KlaimKasKecilDetailRow[]>>({});

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
} = useBrowse({
  menuId: "971",
  fetchApi: async () => {
    const params = {
      startDate: startDate.value,
      endDate: endDate.value,
      cabang: cabang.value,
    };
    const [resBrowse, resDetail] = await Promise.all([
      klaimKasKecilService.getBrowse(params),
      klaimKasKecilService.getBrowseDetail(params),
    ]);

    const grouped: Record<string, KlaimKasKecilDetailRow[]> = {};
    for (const row of resDetail.data.data) {
      if (!grouped[row.Nomor]) grouped[row.Nomor] = [];
      grouped[row.Nomor].push(row);
    }
    detailCache.value = grouped;

    return resBrowse.data.data;
  },
  immediate: false,
});

watch([startDate, endDate, cabang], () => fetchData());

onMounted(async () => {
  await loadCabang();
  fetchData();
});

const selectedRow = computed(
  () => (selectedItem.value ?? null) as KlaimKasKecilRow | null,
);

// --- Headers ---
const headers: HeaderDef[] = [
  { title: "Nomor", key: "Nomor", width: "160px", fixed: true },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Cabang", key: "Cabang", width: "70px", align: "center" },
  { title: "Rekening Tujuan", key: "RekTujuan", width: "210px" },
  { title: "Jml BKK", key: "JumlahBkk", width: "75px", align: "center" },
  { title: "Total", key: "Total", width: "130px", align: "end" },
  { title: "Status", key: "Status", width: "85px", align: "center" },
  {
    title: "Pengajuan Transfer",
    key: "StatusTransfer",
    width: "130px",
    align: "center",
  },
  { title: "No. Pengajuan Transfer", key: "NomorPjt", width: "160px" },
  { title: "Keterangan", key: "Keterangan", width: "220px" },
  { title: "Dibuat", key: "Dibuat", width: "90px" },
];

const numFmt = (v: number | string | null | undefined) =>
  v ? Number(v).toLocaleString("id-ID") : "0";

// Total hanya menghitung klaim AKTIF
const summaryFormatters = {
  Keterangan: () => "TOTAL AKTIF :",
  Total: (filteredItems: KlaimKasKecilRow[]) =>
    numFmt(
      Math.round(
        filteredItems
          .filter((r) => r.Status === "AKTIF")
          .reduce((s, r) => s + (Number(r.Total) || 0), 0),
      ),
    ),
};

// --- Expand ---
const expandedRows = ref<unknown[]>([]);
const onUpdateExpanded = (val: unknown[]) => {
  expandedRows.value = val;
};

// --- Batal klaim ---
const showBatalDialog = ref(false);
const isBatal = ref(false);

const bisaDibatalkan = computed(
  () =>
    !!selectedRow.value &&
    selectedRow.value.Status === "AKTIF" &&
    selectedRow.value.StatusTransfer === "Belum diajukan",
);

const openBatalDialog = () => {
  if (!bisaDibatalkan.value) return;
  showBatalDialog.value = true;
};

const confirmBatal = async () => {
  if (!selectedRow.value) return;
  isBatal.value = true;
  try {
    await klaimKasKecilService.batalKlaim(selectedRow.value.Nomor);
    toast.success("Klaim berhasil dibatalkan.");
    showBatalDialog.value = false;
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal membatalkan klaim."));
  } finally {
    isBatal.value = false;
  }
};

// --- Add / Edit ---
const onAdd = () => router.push("/piutang/klaim-kas-kecil/create");
const onEdit = (item: KlaimKasKecilRow) => {
  router.push(
    `/piutang/klaim-kas-kecil/edit/${encodeURIComponent(item.Nomor)}`,
  );
};

// --- Export ---
const isExporting = ref(false);

const onExport = async () => {
  const dataToExport = (baseBrowseRef.value?.getFilteredItems?.() ??
    items.value ??
    []) as KlaimKasKecilRow[];

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
      numFmt: h.key === "Total" ? "#,##0" : undefined,
    }));

    const rows = dataToExport.map((it) => {
      const row: Record<string, string | number> = {};
      for (const c of columns) {
        switch (c.key) {
          case "Tanggal":
            row[c.key] = it.Tanggal ? formatTanggal(it.Tanggal) : "";
            break;
          case "RekTujuan":
            row[c.key] = `${it.RekTujuan} ${it.NamaRekTujuan}`.trim();
            break;
          default:
            row[c.key] = it[c.key as keyof KlaimKasKecilRow] ?? "";
        }
      }
      return row;
    });

    const periodeLabel = `Periode: ${formatTanggal(startDate.value)} s/d ${formatTanggal(endDate.value)}`;
    await exportExcelSingle(
      `Klaim_Kas_Kecil_${startDate.value}_${endDate.value}.xlsx`,
      "Klaim Kas Kecil",
      columns,
      rows,
      `Laporan Klaim Kas Kecil  |  ${periodeLabel}`,
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
    title="Klaim Kas Kecil"
    menu-id="971"
    :icon="IconCashBanknote"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:filter-state="filterState"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="canExport"
    item-value="Nomor"
    show-expand
    :expanded="expandedRows"
    :summary-columns="['Total']"
    :summary-formatters="summaryFormatters"
    @update:expanded="onUpdateExpanded"
    @add="onAdd"
    @edit="onEdit"
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
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Cabang</span>
        <select v-model="cabang" class="f-select">
          <option value="HO-">SEMUA CABANG</option>
          <option v-for="c in listCabang" :key="c.kode" :value="c.kode">
            {{ c.kode }} - {{ c.nama }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        v-if="canDelete"
        size="small"
        color="error"
        :disabled="!bisaDibatalkan"
        @click="openBatalDialog"
      >
        <template #prepend><IconBan :size="15" /></template>Batal Klaim
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(rowOf(item).Tanggal) }}
    </template>

    <template #item.RekTujuan="{ item }">
      {{ rowOf(item).RekTujuan }} - {{ rowOf(item).NamaRekTujuan }}
    </template>

    <template #item.Total="{ item }">
      {{ numFmt(rowOf(item).Total) }}
    </template>

    <template #item.Status="{ item }">
      <span
        class="kk-badge"
        :class="rowOf(item).Status === 'AKTIF' ? 'badge-green' : 'badge-red'"
      >
        {{ rowOf(item).Status }}
      </span>
    </template>

    <template #item.StatusTransfer="{ item }">
      <span
        v-if="rowOf(item).StatusTransfer !== '-'"
        class="kk-badge"
        :class="{
          'badge-grey': rowOf(item).StatusTransfer === 'Belum diajukan',
          'badge-blue': rowOf(item).StatusTransfer === 'Diajukan',
          'badge-green': rowOf(item).StatusTransfer === 'Terealisasi',
        }"
      >
        {{ rowOf(item).StatusTransfer }}
      </span>
      <span v-else class="text-grey">-</span>
    </template>

    <template #item.NomorPjt="{ item }">
      <span v-if="rowOf(item).NomorPjt">{{ rowOf(item).NomorPjt }}</span>
      <span v-else class="text-grey">-</span>
    </template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <div class="expand-title mb-2">
          BKK yang diklaim - {{ rowOf(item).Nomor }}
        </div>
        <table class="detail-table">
          <thead>
            <tr>
              <th width="160">No. BKK</th>
              <th width="160">No. Kasbon</th>
              <th width="100">Tanggal</th>
              <th>Uraian</th>
              <th width="120" class="tr">Nominal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in detailCache[rowOf(item).Nomor] || []" :key="d.Bkk">
              <td>{{ d.Bkk }}</td>
              <td>{{ d.Bon }}</td>
              <td>{{ formatTanggal(d.Tanggal) }}</td>
              <td>{{ d.Uraian }}</td>
              <td class="tr">{{ numFmt(d.Nominal) }}</td>
            </tr>
            <tr v-if="!(detailCache[rowOf(item).Nomor] || []).length">
              <td colspan="5" class="text-center text-grey py-4 font-italic">
                Data BKK tidak ditemukan.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="showBatalDialog" max-width="400px" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="bg-error text-white pa-3 text-subtitle-1 d-flex align-center"
      >
        <IconBan :size="16" color="white" class="mr-2" />
        Konfirmasi Batal Klaim
      </v-card-title>
      <v-card-text class="pa-4 kk-dialog-text">
        Yakin membatalkan klaim:
        <div class="font-weight-bold text-primary mt-1">
          {{ selectedRow?.Nomor }}
        </div>
        <div class="text-caption text-grey mt-1">
          Total {{ numFmt(selectedRow?.Total) }} ({{ selectedRow?.JumlahBkk }}
          BKK). BKK akan bisa diklaim ulang.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="isBatal"
          @click="showBatalDialog = false"
          >Kembali</v-btn
        >
        <v-btn
          color="error"
          variant="elevated"
          :loading="isBatal"
          @click="confirmBatal"
          >Ya, Batalkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
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
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 11px;
  outline: none;
  background: white;
  color: #212121;
}
.f-select {
  cursor: pointer;
  min-width: 150px;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
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
.badge-red {
  background: #ffebee;
  color: #c62828;
}

.kk-dialog-text {
  font-size: 11px;
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
