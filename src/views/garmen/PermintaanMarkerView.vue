<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  IconScissors,
  IconRepeat,
  IconFlag,
  IconFileExport,
  IconPrinter,
  IconCircleCheck,
} from "@tabler/icons-vue";
import { exportExcelSingle } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import {
  permintaanMarkerService,
  type PermintaanMarkerBrowseItem,
  type PermintaanMarkerDetailRow,
} from "@/services/garmen/permintaanMarkerService";
import { permintaanMarkerFormService } from "@/services/garmen/permintaanMarkerFormService";

interface RowCtx {
  item: PermintaanMarkerBrowseItem & { raw?: PermintaanMarkerBrowseItem };
}
interface KelompokSpk {
  spkNomor: string;
  spkNama: string;
  lhkNomor: string;
  subtotal: number;
  rows: PermintaanMarkerDetailRow[];
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

const STATUS_OPTIONS = ["OPEN", "PROSES", "DONE", "CLOSE", "PENDING", "CANCEL"];

const statusColor = (s: string): string => {
  switch (s) {
    case "CLOSE":
      return "success";
    case "DONE":
      return "teal";
    case "PROSES":
      return "warning";
    case "OPEN":
      return "info";
    case "PENDING":
      return "grey";
    default:
      return "grey-darken-1";
  }
};

// ─── Filter (default: awal bulan ini s/d hari ini) ────────
const now = new Date();
const filterState = ref({
  start: toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
  end: toLocalDate(now),
  status: "",
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
const filterStatus = computed({
  get: () => filterState.value.status,
  set: (v: string) => {
    filterState.value = { ...filterState.value, status: v };
  },
});

const onFilterStateRestored = (state: Record<string, unknown>) => {
  if (typeof state.start === "string") filterState.value.start = state.start;
  if (typeof state.end === "string") filterState.value.end = state.end;
  if (typeof state.status === "string") filterState.value.status = state.status;
};

// ─── State ────────────────────────────────────────────────
const items = ref<PermintaanMarkerBrowseItem[]>([]);
const isLoading = ref(false);
const selected = ref<PermintaanMarkerBrowseItem[]>([]);
const expandedRows = ref<PermintaanMarkerBrowseItem[]>([]);

// Detail seluruh rentang tanggal diambil sekali (lazy), dipakai expand + Export Detail
const detailRows = ref<PermintaanMarkerDetailRow[]>([]);
const detailLoaded = ref(false);
const detailLoading = ref(false);
let detailReq = 0;

const detailByNomor = computed<Record<string, PermintaanMarkerDetailRow[]>>(
  () => {
    const map: Record<string, PermintaanMarkerDetailRow[]> = {};
    for (const r of detailRows.value) {
      if (!map[r.nomor]) {
        map[r.nomor] = [];
      }
      map[r.nomor].push(r);
    }
    return map;
  },
);

// Per dokumen: dikelompokkan per SPK, subtotal marker dan nomor LHK per SPK
const kelompokByNomor = computed<Record<string, KelompokSpk[]>>(() => {
  const hasil: Record<string, KelompokSpk[]> = {};
  for (const [nomor, rows] of Object.entries(detailByNomor.value)) {
    const peta = new Map<string, KelompokSpk>();
    for (const r of rows) {
      const g = peta.get(r.spkNomor) ?? {
        spkNomor: r.spkNomor,
        spkNama: r.spkNama ?? "",
        lhkNomor: r.lhkNomor,
        subtotal: 0,
        rows: [],
      };
      g.rows.push(r);
      g.subtotal += Number(r.jml);
      peta.set(r.spkNomor, g);
    }
    hasil[nomor] = [...peta.values()];
  }
  return hasil;
});

const showStatusDialog = ref(false);
const statusBaru = ref<"PENDING" | "CANCEL">("PENDING");
const statusKet = ref("");
const isActioning = ref(false);
const selectedItem = ref<PermintaanMarkerBrowseItem | null>(null);
const isExportingDetail = ref(false);

// ─── Headers (SPK ada di detail → tampil di expand) ───────
const headers = [
  { title: "NOMOR", key: "nomor", width: "170px" },
  { title: "TANGGAL", key: "tanggal", width: "100px", align: "center" },
  { title: "DEADLINE", key: "deadline", width: "100px", align: "center" },
  {
    title: "SPK SELESAI",
    key: "jmlSpkSelesai",
    width: "100px",
    align: "center",
  },
  { title: "TOTAL MARKER", key: "totalJml", width: "110px", align: "end" },
  { title: "REVISI DARI", key: "asalNomor", width: "170px" },
  { title: "KETERANGAN", key: "keterangan" },
  { title: "STATUS", key: "status", width: "100px", align: "center" },
];

// ─── Fetch ────────────────────────────────────────────────
const resetDetail = () => {
  detailReq++;
  detailRows.value = [];
  detailLoaded.value = false;
  detailLoading.value = false;
};

let filterTimer: ReturnType<typeof setTimeout> | null = null;
watch(
  filterState,
  () => {
    expandedRows.value = [];
    resetDetail();
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
    const res = await permintaanMarkerService.getBrowse({
      startDate: filterStart.value,
      endDate: filterEnd.value,
      status: filterStatus.value,
    });
    items.value = res.data.data ?? [];
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat data."));
  } finally {
    isLoading.value = false;
  }
};

const ensureDetail = async (): Promise<boolean> => {
  if (detailLoaded.value) {
    return true;
  }
  const myReq = ++detailReq;
  detailLoading.value = true;
  try {
    const res = await permintaanMarkerService.getDetail({
      startDate: filterStart.value,
      endDate: filterEnd.value,
    });
    if (myReq !== detailReq) {
      return false;
    }
    detailRows.value = res.data.data ?? [];
    detailLoaded.value = true;
    return true;
  } catch (e) {
    if (myReq === detailReq) {
      toast.error(pesanError(e, "Gagal memuat detail."));
    }
    return false;
  } finally {
    if (myReq === detailReq) {
      detailLoading.value = false;
    }
  }
};

// ─── Expand ───────────────────────────────────────────────
const handleExpand = async (newExpanded: PermintaanMarkerBrowseItem[]) => {
  expandedRows.value = newExpanded;
  if (newExpanded.length && !detailLoaded.value && !detailLoading.value) {
    await ensureDetail();
  }
};

// ─── Row props: CANCEL abu-abu dicoret; deadline merah/oranye ───
const rowPropsFn = (data: RowCtx) => {
  const item = data.item.raw ?? data.item;
  if (item.status === "CANCEL") {
    return {
      style: "color: #9e9e9e !important; text-decoration: line-through;",
    };
  }
  if (item.status === "OPEN" || item.status === "PROSES") {
    if (item.sisaHari < 0) {
      return { style: "color: #c62828 !important; font-weight: 600;" };
    }
    if (item.sisaHari <= 1) {
      return { style: "color: #e65100 !important; font-weight: 600;" };
    }
  }
  return {};
};

// ─── Navigasi form ────────────────────────────────────────
const onAdd = () => {
  router.push({ name: "PermintaanMarkerCreate" });
};

const onEdit = () => {
  const it = selected.value[0];
  if (!it) {
    return;
  }
  if (it.status === "CANCEL") {
    toast.warning("Permintaan yang sudah dibatalkan tidak dapat diubah.");
    return;
  }
  if (it.jmlSpkSelesai > 0) {
    toast.warning("Permintaan sudah punya LHK Marker, tidak dapat diubah.");
    return;
  }
  router.push({ name: "PermintaanMarkerEdit", params: { nomor: it.nomor } });
};

// Revisi: buka form dengan isi permintaan asal
const onRevisi = () => {
  const it = selected.value[0];
  if (!it) {
    return;
  }
  router.push({ name: "PermintaanMarkerCreate", query: { asal: it.nomor } });
};

// ─── Close: Admin Cutting sudah mengambil hasil marker ────
const showCloseDialog = ref(false);

const openCloseDialog = () => {
  if (selected.value.length !== 1) {
    return;
  }
  selectedItem.value = selected.value[0];
  showCloseDialog.value = true;
};

const confirmClose = async () => {
  const it = selectedItem.value;
  if (!it) {
    return;
  }
  isActioning.value = true;
  try {
    await permintaanMarkerFormService.closePermintaan(it.nomor);
    toast.success("Permintaan di-CLOSE.");
    showCloseDialog.value = false;
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal melakukan close."));
  } finally {
    isActioning.value = false;
  }
};

// ─── Cetak: halaman cetak dibuka di tab baru ──────────────
const onCetak = () => {
  const it = selected.value[0];
  if (!it) {
    return;
  }
  const href = router.resolve({
    name: "PermintaanMarkerPrint",
    params: { nomor: it.nomor },
  }).href;
  window.open(href, "_blank");
};

// ─── Hapus (dialog konfirmasi dari BaseBrowse) ────────────
const beforeDelete = (item: PermintaanMarkerBrowseItem): boolean => {
  if (item.jmlSpkSelesai > 0) {
    toast.warning("Permintaan sudah punya LHK Marker, tidak bisa dihapus.");
    return false;
  }
  return true;
};

const onDelete = async (item: PermintaanMarkerBrowseItem) => {
  try {
    await permintaanMarkerService.deleteData(item.nomor);
    toast.success("Permintaan Marker berhasil dihapus.");
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal menghapus."));
  }
};

// ─── Status manual: PENDING / CANCEL / buka kembali ───────
const openStatusDialog = () => {
  if (selected.value.length !== 1) {
    return;
  }
  selectedItem.value = selected.value[0];
  statusBaru.value = "PENDING";
  statusKet.value = "";
  showStatusDialog.value = true;
};

const confirmStatus = async () => {
  const it = selectedItem.value;
  if (!it) {
    return;
  }
  const bukaKembali = !!it.statusManual;
  if (!bukaKembali && !statusKet.value.trim()) {
    toast.warning("Keterangan wajib diisi.");
    return;
  }
  isActioning.value = true;
  try {
    await permintaanMarkerFormService.setStatus(it.nomor, {
      status: bukaKembali ? "" : statusBaru.value,
      keterangan: bukaKembali ? "" : statusKet.value.trim(),
    });
    toast.success(
      bukaKembali ? "Permintaan dibuka kembali." : "Status diperbarui.",
    );
    showStatusDialog.value = false;
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal mengubah status."));
  } finally {
    isActioning.value = false;
  }
};

// ─── Export ───────────────────────────────────────────────
const dataTampil = (): PermintaanMarkerBrowseItem[] =>
  (browseRef.value?.getFilteredItems() as
    | PermintaanMarkerBrowseItem[]
    | undefined) ?? items.value;

const doExport = async () => {
  const rows = dataTampil();
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  try {
    await exportExcelSingle(
      `PermintaanMarker_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Permintaan Marker",
      [
        { header: "Nomor", key: "nomor", width: 22 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "Deadline", key: "deadline", width: 12 },
        {
          header: "SPK Selesai",
          key: "jmlSpkSelesai",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Jumlah SPK",
          key: "jmlSpk",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Total Marker",
          key: "totalJml",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Revisi Dari", key: "asalNomor", width: 22 },
        { header: "Status", key: "status", width: 12 },
        { header: "Keterangan", key: "keterangan", width: 40 },
      ],
      rows.map((r) => ({
        nomor: r.nomor,
        tanggal: formatTanggal(r.tanggal),
        deadline: formatTanggal(r.deadline),
        jmlSpkSelesai: Number(r.jmlSpkSelesai),
        jmlSpk: Number(r.jmlSpk),
        totalJml: Number(r.totalJml),
        asalNomor: r.asalNomor ?? "",
        status: r.status,
        keterangan: r.keterangan ?? "",
      })),
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export."));
  }
};

const doExportDetail = async () => {
  const tampil = dataTampil();
  const petaHeader = new Map(tampil.map((r) => [r.nomor, r]));
  if (!petaHeader.size) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExportingDetail.value = true;
  try {
    if (!(await ensureDetail())) {
      return;
    }
    const rows = detailRows.value.filter((r) => petaHeader.has(r.nomor));
    if (!rows.length) {
      toast.warning("Tidak ada detail untuk diekspor.");
      return;
    }
    await exportExcelSingle(
      `PermintaanMarkerDetail_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Detail Permintaan Marker",
      [
        { header: "Nomor", key: "nomor", width: 22 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "Deadline", key: "deadline", width: 12 },
        { header: "Status", key: "status", width: 12 },
        { header: "SPK", key: "spkNomor", width: 20 },
        { header: "Nama SPK", key: "spkNama", width: 36 },
        { header: "Kode Bahan", key: "kode", width: 18 },
        { header: "Nama Bahan", key: "namaBahan", width: 36 },
        { header: "Satuan", key: "satuan", width: 10 },
        { header: "Setting", key: "setting", width: 14 },
        {
          header: "Jml Marker",
          key: "jml",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Alasan", key: "alasan", width: 36 },
        { header: "LHK Marker", key: "lhkNomor", width: 24 },
      ],
      rows.map((r) => {
        const h = petaHeader.get(r.nomor);
        return {
          nomor: r.nomor,
          tanggal: h ? formatTanggal(h.tanggal) : "",
          deadline: h ? formatTanggal(h.deadline) : "",
          status: h?.status ?? "",
          spkNomor: r.spkNomor,
          spkNama: r.spkNama ?? "",
          kode: r.kode,
          namaBahan: r.namaBahan,
          satuan: r.satuan,
          setting: r.setting,
          jml: Number(r.jml),
          alasan: r.alasan,
          lhkNomor: r.lhkNomor,
        };
      }),
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export detail."));
  } finally {
    isExportingDetail.value = false;
  }
};

// ─── Init ─────────────────────────────────────────────────
fetchData();
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="Permintaan Marker"
    menu-id="189"
    :icon="IconScissors"
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
    item-value="nomor"
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
        <span class="f-label ml-2">Status</span>
        <select v-model="filterStatus" class="f-date">
          <option value="">Semua</option>
          <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">
            {{ s }}
          </option>
        </select>
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
    </template>

    <!-- ─── Extra actions ─── -->
    <template #extra-actions="{ selected }">
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
        color="primary"
        :disabled="selected.length !== 1 || selected[0].status === 'CANCEL'"
        @click="onRevisi"
      >
        <template #prepend><IconRepeat :size="15" /></template>
        Revisi
      </v-btn>
      <v-btn
        size="small"
        color="warning"
        :disabled="selected.length !== 1"
        @click="openStatusDialog"
      >
        <template #prepend><IconFlag :size="15" /></template>
        Status
      </v-btn>
      <v-btn
        size="small"
        color="success"
        :disabled="
          selected.length !== 1 ||
          selected[0].status === 'DONE' ||
          selected[0].status === 'CLOSE'
        "
        @click="openCloseDialog"
      >
        <template #prepend><IconCircleCheck :size="15" /></template>
        Close
      </v-btn>
      <v-btn
        size="small"
        color="primary"
        :disabled="selected.length !== 1"
        @click="onCetak"
      >
        <template #prepend><IconPrinter :size="15" /></template>
        Cetak
      </v-btn>
    </template>

    <template #item.tanggal="{ item }">
      {{ formatTanggal(item.tanggal) }}
    </template>

    <template #item.deadline="{ item }">
      {{ formatTanggal(item.deadline) }}
    </template>

    <template #item.jmlSpkSelesai="{ item }">
      {{ item.jmlSpkSelesai }} / {{ item.jmlSpk }}
    </template>

    <template #item.totalJml="{ item }">
      {{ fmtJml(item.totalJml) }}
    </template>

    <template #item.asalNomor="{ item }">
      {{ item.asalNomor || "-" }}
    </template>

    <template #item.status="{ item }">
      <v-chip
        size="x-small"
        :color="statusColor(item.status)"
        variant="flat"
        class="font-weight-bold"
        :title="item.statusKeterangan"
      >
        {{ item.status }}
      </v-chip>
    </template>

    <!-- ─── Expand: detail per SPK ─── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div v-if="detailLoading && !detailLoaded" class="expand-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>

        <template v-else-if="detailLoaded">
          <div v-if="item.statusManual" class="expand-info txt-batal">
            <b>{{ item.statusManual }}:</b> {{ item.statusKeterangan || "-" }}
          </div>
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 170px">KODE BAHAN</th>
                <th style="width: 280px">NAMA BAHAN</th>
                <th style="width: 70px">SATUAN</th>
                <th style="width: 130px">SETTING</th>
                <th style="width: 110px" class="num">JML MARKER</th>
                <th>ALASAN (BAHAN DI LUAR MKB)</th>
              </tr>
            </thead>
            <tbody
              v-for="g in kelompokByNomor[item.nomor] ?? []"
              :key="g.spkNomor"
            >
              <tr class="grp-row">
                <td colspan="4">
                  {{ g.spkNomor
                  }}<span v-if="g.spkNama"> - {{ g.spkNama }}</span>
                </td>
                <td class="num">{{ fmtJml(g.subtotal) }}</td>
                <td :class="g.lhkNomor ? 'txt-ok' : 'txt-belum'">
                  {{
                    g.lhkNomor ? `LHK: ${g.lhkNomor}` : "Belum ada LHK Marker"
                  }}
                </td>
              </tr>
              <tr v-for="d in g.rows" :key="d.id">
                <td>{{ d.kode }}</td>
                <td>{{ d.namaBahan }}</td>
                <td>{{ d.satuan }}</td>
                <td>{{ d.setting }}</td>
                <td class="num">{{ fmtJml(d.jml) }}</td>
                <td class="cell-wrap">{{ d.alasan || "-" }}</td>
              </tr>
            </tbody>
            <tbody v-if="!(kelompokByNomor[item.nomor] ?? []).length">
              <tr>
                <td colspan="6" class="empty-row">&lt;Tidak ada detail&gt;</td>
              </tr>
            </tbody>
          </table>
        </template>

        <div v-else class="expand-empty">Tidak ada data detail.</div>
      </div>
    </template>

    <template #delete-warning="{ item }">
      <div class="text-body-2 font-weight-black text-decoration-underline">
        {{ item?.nomor }}
      </div>
    </template>
  </BaseBrowse>

  <!-- ─── Dialog Close ─── -->
  <v-dialog v-model="showCloseDialog" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-success text-white pa-3 text-subtitle-1">
        Close Permintaan Marker
      </v-card-title>
      <v-card-text class="pa-4">
        Tandai permintaan <b>{{ selectedItem?.nomor }}</b> selesai: hasil marker
        sudah diambil Tim Cutting. LHK Marker yang terkait tidak bisa diubah
        lagi setelah ini.
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showCloseDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="success"
          variant="elevated"
          :loading="isActioning"
          @click="confirmClose"
          >Ya, Close</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ─── Dialog Status ─── -->
  <v-dialog v-model="showStatusDialog" max-width="440" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-warning text-white pa-3 text-subtitle-1">
        {{ selectedItem?.statusManual ? "Buka Kembali" : "Ubah Status" }}
      </v-card-title>
      <v-card-text class="pa-4">
        <template v-if="selectedItem?.statusManual">
          Permintaan <b>{{ selectedItem?.nomor }}</b> berstatus
          <b>{{ selectedItem?.statusManual }}</b
          >. Buka kembali supaya statusnya kembali mengikuti LHK Marker?
        </template>
        <template v-else>
          <div class="mb-3">
            Ubah status permintaan <b>{{ selectedItem?.nomor }}</b
            >:
          </div>
          <v-radio-group v-model="statusBaru" inline hide-details class="mb-2">
            <v-radio label="PENDING" value="PENDING" />
            <v-radio label="CANCEL" value="CANCEL" />
          </v-radio-group>
          <v-textarea
            v-model="statusKet"
            label="Keterangan (wajib)"
            rows="2"
            auto-grow
            density="compact"
            variant="outlined"
            maxlength="255"
            counter
            hide-details="auto"
          />
        </template>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showStatusDialog = false">Tutup</v-btn>
        <v-spacer />
        <v-btn
          color="warning"
          variant="elevated"
          :loading="isActioning"
          @click="confirmStatus"
          >{{
            selectedItem?.statusManual ? "Ya, Buka Kembali" : "Simpan"
          }}</v-btn
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
.expand-info {
  font-size: 11px;
  color: #37474f;
  padding: 2px 2px 6px;
  white-space: pre-wrap;
}
.txt-batal {
  color: #c62828;
}
.txt-ok {
  color: #2e7d32;
}
.txt-belum {
  color: #9e9e9e;
  font-style: italic;
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
.dt .grp-row td {
  background: #cfd8dc !important;
  font-weight: 700;
  font-size: 11px;
  border-bottom: 1px solid #b0bec5;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 10px;
  font-size: 11px;
}
</style>
