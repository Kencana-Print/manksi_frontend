<script setup lang="ts">
import { ref, computed, watch, onActivated } from "vue";
import { useToast } from "vue-toastification";
import { useRouter } from "vue-router";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  IconShoppingCart,
  IconFileExport,
  IconPrinter,
  IconLock,
} from "@tabler/icons-vue";
import { exportExcelSingle } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import {
  permintaanPembelianBahanService,
  type PermintaanPembelianBahanBrowseItem,
  type PermintaanPembelianBahanDetailRow,
} from "@/services/garmen/permintaanPembelianBahanService";

interface RowCtx {
  item: PermintaanPembelianBahanBrowseItem & {
    raw?: PermintaanPembelianBahanBrowseItem;
  };
}

const toast = useToast();
const router = useRouter();
const browseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// ─── Helpers ──────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const fmtJml = (v: number | string | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID");

// Status kosong = belum ada PO → tampil OPEN
const statusLabel = (s: string | null | undefined): string => s || "OPEN";

const statusColor = (s: string | null | undefined): string => {
  switch (statusLabel(s)) {
    case "OPEN":
      return "error"; // merah
    case "PROSES":
      return "primary"; // biru
    default:
      return "black"; // CLOSE / DICLOSE
  }
};

// ─── Filter (default: awal bulan ini s/d hari ini) ────────
const now = new Date();
const filterState = ref({
  start: toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
  end: toLocalDate(now),
});

const filterStart = computed({
  get: () => filterState.value.start,
  set: (v: string) => {
    filterState.value = { ...filterState.value, start: v };
  },
});
const filterEnd = computed({
  get: () => filterState.value.end,
  set: (v: string) => {
    filterState.value = { ...filterState.value, end: v };
  },
});

const onFilterStateRestored = (state: Record<string, unknown>) => {
  if (typeof state.start === "string") filterState.value.start = state.start;
  if (typeof state.end === "string") filterState.value.end = state.end;
};

// ─── State ────────────────────────────────────────────────
const items = ref<PermintaanPembelianBahanBrowseItem[]>([]);
const isLoading = ref(false);
const selected = ref<PermintaanPembelianBahanBrowseItem[]>([]);
const expandedRows = ref<PermintaanPembelianBahanBrowseItem[]>([]);

// Detail dimuat per dokumen saat di-expand, di-cache per nomor
const detailMap = ref<Record<string, PermintaanPembelianBahanDetailRow[]>>({});
const detailLoading = ref<Record<string, boolean>>({});
let fetchGen = 0;
const isExportingDetail = ref(false);

// ─── Headers ──────────────────────────────────────────────
const headers = [
  { title: "NOMOR", key: "Nomor", width: "170px" },
  { title: "TANGGAL", key: "Tanggal", width: "100px", align: "center" },
  { title: "CAB", key: "Cab", width: "60px", align: "center" },
  { title: "BAGIAN", key: "Bagian", width: "110px" },
  { title: "JML ITEM", key: "JmlItem", width: "80px", align: "end" },
  { title: "KETERANGAN", key: "Keterangan" },
  { title: "USER", key: "Usr", width: "80px" },
  { title: "STATUS", key: "Status", width: "100px", align: "center" },
];

// ─── Fetch ────────────────────────────────────────────────
const resetDetail = () => {
  fetchGen++;
  detailMap.value = {};
  detailLoading.value = {};
};

let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  filterState,
  () => {
    if (filterTimer) clearTimeout(filterTimer);
    filterTimer = setTimeout(fetchData, 400);
  },
  { deep: true },
);

const fetchData = async () => {
  isLoading.value = true;
  selected.value = [];
  expandedRows.value = [];
  resetDetail();
  try {
    const res = await permintaanPembelianBahanService.getBrowse({
      startDate: filterStart.value,
      endDate: filterEnd.value,
    });
    items.value = res.data.data ?? [];
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat data."));
  } finally {
    isLoading.value = false;
  }
};

const loadDetail = async (nomor: string) => {
  if (detailMap.value[nomor] || detailLoading.value[nomor]) return;
  const gen = fetchGen;
  detailLoading.value = { ...detailLoading.value, [nomor]: true };
  try {
    const res = await permintaanPembelianBahanService.getDetail(nomor);
    if (gen !== fetchGen) return;
    detailMap.value = { ...detailMap.value, [nomor]: res.data.data ?? [] };
  } catch (e) {
    if (gen === fetchGen) {
      toast.error(pesanError(e, `Gagal memuat detail ${nomor}.`));
    }
  } finally {
    if (gen === fetchGen) {
      detailLoading.value = { ...detailLoading.value, [nomor]: false };
    }
  }
};

// ─── Expand ───────────────────────────────────────────────
const handleExpand = (newExpanded: PermintaanPembelianBahanBrowseItem[]) => {
  expandedRows.value = newExpanded;
  for (const it of newExpanded) {
    loadDetail(it.Nomor);
  }
};

// ─── Row props: OPEN merah, PROSES biru, CLOSE/DICLOSE hitam ──
const rowPropsFn = (data: RowCtx) => {
  const item = data.item.raw ?? data.item;
  const classes: string[] = ["font-weight-medium"];
  const st = statusLabel(item.Status);
  if (st === "OPEN") classes.push("text-error");
  else if (st === "PROSES") classes.push("text-primary");
  return { class: classes.join(" ") };
};

// ─── Navigasi form ────────────────────────────────────────
const onAdd = () => {
  router.push({ name: "PermintaanPembelianBahanCreate" });
};

const onEdit = () => {
  const it = selected.value[0];
  if (!it) return;
  if (it.Status) {
    toast.warning(`Sudah ${it.Status}, tidak bisa diubah.`);
    return;
  }
  router.push({
    name: "PermintaanPembelianBahanEdit",
    params: { nomor: it.Nomor },
  });
};

const onPrint = () => {
  const it = selected.value[0];
  if (!it) return toast.warning("Pilih data permintaan terlebih dahulu.");
  const url = router.resolve({
    name: "PermintaanPembelianBahanPrint",
    params: { nomor: it.Nomor },
  }).href;
  window.open(url, "_blank");
};

// ─── Close manual ─────────────────────────────────────────
const closeDialog = ref(false);
const closeAlasan = ref("");
const isClosing = ref(false);

const bisaClose = computed(() => {
  const it = selected.value[0];
  return !!it && it.Status !== "DICLOSE" && it.Status !== "CLOSE";
});

const onClose = () => {
  if (!bisaClose.value) {
    toast.warning("Pilih permintaan yang belum CLOSE.");
    return;
  }
  closeAlasan.value = "";
  closeDialog.value = true;
};

const doClose = async () => {
  const it = selected.value[0];
  if (!it) return;
  const alasan = closeAlasan.value.trim();
  if (!alasan) {
    toast.warning("Alasan close wajib diisi.");
    return;
  }
  isClosing.value = true;
  try {
    await permintaanPembelianBahanService.closeData(it.Nomor, alasan);
    toast.success(`${it.Nomor} berhasil ditutup.`);
    closeDialog.value = false;
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal menutup permintaan."));
  } finally {
    isClosing.value = false;
  }
};

// ─── Hapus (dialog konfirmasi dari BaseBrowse) ────────────
const beforeDelete = (item: PermintaanPembelianBahanBrowseItem): boolean => {
  if (item.Status) {
    toast.warning(`Sudah ${item.Status}, tidak bisa dihapus.`);
    return false;
  }
  return true;
};

const onDelete = async (item: PermintaanPembelianBahanBrowseItem) => {
  try {
    await permintaanPembelianBahanService.deleteData(item.Nomor);
    toast.success("Permintaan Pembelian Bahan berhasil dihapus.");
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal menghapus."));
  }
};

// ─── Export ───────────────────────────────────────────────
const doExport = async () => {
  const rows =
    (browseRef.value?.getFilteredItems() as
      | PermintaanPembelianBahanBrowseItem[]
      | undefined) ?? items.value;
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  try {
    await exportExcelSingle(
      `PermintaanPembelianBahan_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Permintaan Pembelian Bahan",
      [
        { header: "Nomor", key: "nomor", width: 22 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "Cab", key: "cab", width: 8 },
        { header: "Bagian", key: "bagian", width: 16 },
        {
          header: "Jml Item",
          key: "jmlItem",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Status", key: "status", width: 12 },
        { header: "Keterangan", key: "keterangan", width: 40 },
      ],
      rows.map((r) => ({
        nomor: r.Nomor,
        tanggal: formatTanggal(r.Tanggal),
        cab: r.Cab,
        bagian: r.Bagian,
        jmlItem: Number(r.JmlItem),
        status: r.Status,
        keterangan: r.Keterangan ?? "",
      })),
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export."));
  }
};

const doExportDetail = async () => {
  const tampil =
    (browseRef.value?.getFilteredItems() as
      | PermintaanPembelianBahanBrowseItem[]
      | undefined) ?? items.value;
  const nomorTampil = new Set(tampil.map((r) => r.Nomor));
  if (!nomorTampil.size) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExportingDetail.value = true;
  try {
    const res = await permintaanPembelianBahanService.getDetailRange({
      startDate: filterStart.value,
      endDate: filterEnd.value,
    });
    const rows = (res.data.data ?? []).filter((r) => nomorTampil.has(r.Nomor));
    if (!rows.length) {
      toast.warning("Tidak ada detail untuk diekspor.");
      return;
    }
    await exportExcelSingle(
      `PermintaanPembelianBahanDetail_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Detail Permintaan Pembelian Bahan",
      [
        { header: "Nomor", key: "nomor", width: 22 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "Cab", key: "cab", width: 8 },
        { header: "Status", key: "status", width: 12 },
        { header: "Kode Bahan", key: "kode", width: 18 },
        { header: "Nama Bahan", key: "nama", width: 36 },
        { header: "Setting", key: "setting", width: 14 },
        { header: "Satuan", key: "satuan", width: 10 },
        { header: "Jumlah", key: "jumlah", align: "right", numFmt: "#,##0.00" },
        {
          header: "Dipesan",
          key: "dipesan",
          align: "right",
          numFmt: "#,##0.00",
        },
        { header: "Sisa", key: "sisa", align: "right", numFmt: "#,##0.00" },
        { header: "PO", key: "po", width: 30 },
        { header: "Keterangan", key: "keterangan", width: 40 },
      ],
      rows.map((r) => ({
        nomor: r.Nomor,
        tanggal: formatTanggal(r.Tanggal),
        cab: r.Cab,
        status: r.Status,
        kode: r.Kode,
        nama: r.Nama,
        setting: r.Setting,
        satuan: r.Satuan,
        jumlah: Number(r.Jumlah),
        dipesan: Number(r.Dipesan),
        sisa: Number(r.Sisa),
        po: r.PO,
        keterangan: r.Keterangan ?? "",
      })),
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export detail."));
  } finally {
    isExportingDetail.value = false;
  }
};

// ─── Init ─────────────────────────────────────────────────
fetchData();

// View dipertahankan (keep-alive): muat ulang tiap kembali dari form.
// Aktivasi pertama dilewati karena fetchData() di atas sudah jalan.
let sudahAktif = false;
onActivated(() => {
  if (!sudahAktif) {
    sudahAktif = true;
    return;
  }
  fetchData();
});
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="Permintaan Pembelian Bahan"
    menu-id="190"
    :icon="IconShoppingCart"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    :expanded="expandedRows"
    @update:expanded="handleExpand"
    show-expand
    :can-insert="true"
    :can-edit="true"
    :can-delete="true"
    :before-delete="beforeDelete"
    :can-export="true"
    item-value="Nomor"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestored"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @export="doExport"
  >
    <!-- ─── Filter ─── -->
    <template #filter-left>
      <div class="date-filter">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterStart" class="f-date" />
        <span class="f-sep">sd</span>
        <input type="date" v-model="filterEnd" class="f-date" />
        <v-btn
          color="primary"
          variant="tonal"
          size="small"
          height="26"
          class="px-2"
          @click="fetchData"
          >Filter</v-btn
        >
      </div>

      <div class="legend-container">
        <div class="legend-item"><span class="l-box bg-error"></span> OPEN</div>
        <div class="legend-item">
          <span class="l-box bg-primary"></span> PROSES
        </div>
        <div class="legend-item">
          <span class="l-box bg-black"></span> CLOSE
        </div>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="green-darken-2"
        :loading="isExportingDetail"
        @click="doExportDetail"
      >
        <template #prepend><IconFileExport :size="14" /></template>Export Detail
      </v-btn>
      <v-btn
        size="small"
        color="grey-darken-3"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend><IconPrinter :size="15" /></template>Cetak
      </v-btn>
      <v-btn
        size="small"
        color="orange-darken-3"
        :disabled="!bisaClose"
        @click="onClose"
      >
        <template #prepend><IconLock :size="15" /></template>Close
      </v-btn>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal(item.Tanggal) }}
    </template>

    <template #item.JmlItem="{ item }">
      {{ fmtJml(item.JmlItem) }}
    </template>

    <template #item.Status="{ item }">
      <v-chip
        size="x-small"
        :color="statusColor(item.Status)"
        variant="flat"
        class="font-weight-bold"
      >
        {{ statusLabel(item.Status) }}
      </v-chip>
    </template>

    <!-- ─── Expand: detail bahan ─── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div v-if="detailLoading[item.Nomor]" class="expand-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>

        <table v-else-if="detailMap[item.Nomor]" class="dt">
          <thead>
            <tr>
              <th style="width: 170px">KODE BAHAN</th>
              <th style="width: 280px">NAMA BAHAN</th>
              <th style="width: 120px">SETTING</th>
              <th style="width: 70px">SATUAN</th>
              <th style="width: 90px" class="num">JUMLAH</th>
              <th style="width: 90px" class="num">DIPESAN</th>
              <th style="width: 90px" class="num">SISA</th>
              <th style="width: 200px">PO</th>
              <th>KETERANGAN</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in detailMap[item.Nomor]" :key="d.Kode">
              <td>{{ d.Kode }}</td>
              <td>{{ d.Nama }}</td>
              <td>{{ d.Setting || "-" }}</td>
              <td>{{ d.Satuan }}</td>
              <td class="num">{{ fmtJml(d.Jumlah) }}</td>
              <td class="num">{{ fmtJml(d.Dipesan) }}</td>
              <td class="num">{{ fmtJml(d.Sisa) }}</td>
              <td class="cell-wrap">{{ d.PO || "-" }}</td>
              <td class="cell-wrap">{{ d.Keterangan || "-" }}</td>
            </tr>
            <tr v-if="!detailMap[item.Nomor].length">
              <td colspan="9" class="empty-row">&lt;Tidak ada detail&gt;</td>
            </tr>
          </tbody>
        </table>

        <div v-else class="expand-empty">Tidak ada data detail.</div>
      </div>
    </template>

    <template #delete-warning="{ item }">
      <div class="text-body-2 font-weight-black text-decoration-underline">
        {{ item?.Nomor }}
      </div>
    </template>
  </BaseBrowse>

  <v-dialog v-model="closeDialog" max-width="440" persistent>
    <v-card>
      <v-card-title class="text-subtitle-2 font-weight-bold">
        Close Permintaan {{ selected[0]?.Nomor }}
      </v-card-title>
      <v-card-text class="text-caption">
        Permintaan ditutup walau belum terpesan penuh. Setelah ditutup tidak
        bisa dibuka kembali, diubah, atau dipilih di PO baru.
        <v-textarea
          v-model="closeAlasan"
          label="Alasan close"
          rows="3"
          maxlength="255"
          counter
          density="compact"
          variant="outlined"
          class="mt-3"
          autofocus
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn size="small" :disabled="isClosing" @click="closeDialog = false"
          >Batal</v-btn
        >
        <v-btn
          size="small"
          color="orange-darken-3"
          variant="flat"
          :loading="isClosing"
          @click="doClose"
          >Close Permintaan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* ─── Filter ─── */
.date-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px 10px;
}
.f-label {
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.f-date {
  height: 26px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 4px;
  font-size: 11px;
  outline: none;
  background: white;
}
.f-date:focus {
  border-color: #1976d2;
}
.f-sep {
  font-size: 11px;
  color: #757575;
}

/* ─── Legend warna ─── */
.legend-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  padding: 2px 8px;
  border-radius: 4px;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
}
.l-box {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* ─── Expand ─── */
.expand-wrap {
  padding: 6px 6px 6px 48px;
  background: #eceff1;
  min-width: 0;
}
.expand-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  font-size: 12px;
  color: #555;
}
.expand-empty {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 12px;
  font-size: 11px;
}

/* ─── Detail table ─── */
.dt {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
}
.dt thead th {
  padding: 4px 8px;
  font-weight: 700;
  font-size: 10px;
  text-align: left;
  white-space: nowrap;
  background: #546e7a;
  color: white;
}
.dt thead th.num,
.dt tbody td.num {
  text-align: right;
}
.dt tbody td {
  padding: 3px 8px;
  border-bottom: 1px solid #eee;
  white-space: nowrap;
  vertical-align: top;
}
.dt td.cell-wrap {
  white-space: pre-wrap;
  min-width: 200px;
  max-width: 420px;
}
.dt tbody tr:nth-of-type(even) td {
  background: #fafafa;
}
.dt tbody tr:hover td {
  background: #e8f5e9 !important;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 10px;
  font-size: 11px;
}
</style>
