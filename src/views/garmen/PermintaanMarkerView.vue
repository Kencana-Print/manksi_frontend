<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  IconScissors,
  IconFileExport,
  IconPrinter,
  IconReceipt,
} from "@tabler/icons-vue";
import { exportExcelSingle } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { pesanError } from "@/services/piutang/rekapPembayaranService";
import {
  permintaanMarkerService,
  type PermintaanMarkerBrowseItem,
  type PermintaanMarkerDetailRow,
  type TandaTerimaPermintaanItem,
} from "@/services/garmen/permintaanMarkerService";
import { useAuthStore } from "@/stores/authStore";
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

const tgl = (v: string | null | undefined): string =>
  v ? formatTanggal(String(v).substring(0, 10)) : "-";

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

// Per dokumen: dikelompokkan per SPK, subtotal marker (data lama) dan nomor LHK per SPK
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

// Kolom Jml Marker / Alasan hanya tampil bila permintaan itu punya isinya (data lama)
const adaJmlByNomor = computed<Record<string, boolean>>(() => {
  const hasil: Record<string, boolean> = {};
  for (const [nomor, rows] of Object.entries(detailByNomor.value)) {
    hasil[nomor] = rows.some((r) => Number(r.jml) > 0);
  }
  return hasil;
});
const adaAlasanByNomor = computed<Record<string, boolean>>(() => {
  const hasil: Record<string, boolean> = {};
  for (const [nomor, rows] of Object.entries(detailByNomor.value)) {
    hasil[nomor] = rows.some((r) => !!r.alasan);
  }
  return hasil;
});
const jumlahKolom = (nomor: string): number =>
  4 +
  (adaJmlByNomor.value[nomor] ? 1 : 0) +
  (adaAlasanByNomor.value[nomor] ? 1 : 0);

const isActioning = ref(false);
const isExportingDetail = ref(false);
const modeMenunggu = ref(false);

// ─── Headers (SPK satu per permintaan → tampil di baris utama; bahan di expand) ───
const headers = [
  { title: "NOMOR", key: "nomor", width: "170px" },
  { title: "SPK", key: "spkNomor", width: "180px" },
  { title: "NAMA SPK", key: "spkNama", width: "360px" },
  { title: "TANGGAL", key: "tanggal", width: "100px", align: "center" },
  { title: "DEADLINE", key: "deadline", width: "100px", align: "center" },
  {
    title: "TGL DIKERJAKAN",
    key: "tglDikerjakan",
    width: "110px",
    align: "center",
  },
  { title: "TGL LHK", key: "tglLhk", width: "100px", align: "center" },
  { title: "TGL MUTASI", key: "tglMutasi", width: "100px", align: "center" },
  { title: "TGL TERIMA", key: "tglTerima", width: "100px", align: "center" },
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
    if (modeMenunggu.value) {
      const res = await permintaanMarkerService.getMenungguValidasi();
      items.value = res.data.data ?? [];
    } else {
      const res = await permintaanMarkerService.getBrowse({
        startDate: filterStart.value,
        endDate: filterEnd.value,
        status: filterStatus.value,
      });
      items.value = res.data.data ?? [];
    }
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat data."));
  } finally {
    isLoading.value = false;
  }
};

watch(modeMenunggu, () => {
  fetchData();
});

const rentangDetail = (): { startDate: string; endDate: string } => {
  if (!modeMenunggu.value || !items.value.length) {
    return { startDate: filterStart.value, endDate: filterEnd.value };
  }
  const tglList = items.value
    .map((r) => String(r.tanggal).substring(0, 10))
    .sort();
  return { startDate: tglList[0], endDate: tglList[tglList.length - 1] };
};

const ensureDetail = async (): Promise<boolean> => {
  if (detailLoaded.value) {
    return true;
  }
  const myReq = ++detailReq;
  detailLoading.value = true;
  try {
    const res = await permintaanMarkerService.getDetail(rentangDetail());
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

// ─── Tanda terima marker: validasi digital oleh pembuat permintaan ───
const authStore = useAuthStore();
const kodeUser = computed(() =>
  String(authStore.user?.kode ?? "").toUpperCase(),
);

const showTtDialog = ref(false);
const ttPermintaan = ref<PermintaanMarkerBrowseItem | null>(null);
const ttList = ref<TandaTerimaPermintaanItem[]>([]);
const ttLoading = ref(false);
const ttPilih = ref<TandaTerimaPermintaanItem | null>(null);
const showKonfirmasiValidasi = ref(false);

const statusTt = (t: TandaTerimaPermintaanItem): string => {
  if (t.tglTerima) return "Diterima";
  if (t.tglMutasi) return "Diserahkan";
  return "Belum dicetak";
};

const bisaValidasi = (t: TandaTerimaPermintaanItem): boolean =>
  !!t.tglMutasi &&
  !t.tglTerima &&
  String(t.peminta).toUpperCase() === kodeUser.value;

const muatTandaTerima = async () => {
  const it = ttPermintaan.value;
  if (!it) {
    return;
  }
  ttLoading.value = true;
  try {
    const res = await permintaanMarkerService.listTandaTerima(it.nomor);
    ttList.value = res.data.data ?? [];
  } catch (e) {
    toast.error(pesanError(e, "Gagal memuat tanda terima."));
  } finally {
    ttLoading.value = false;
  }
};

const bukaTandaTerima = async () => {
  const it = selected.value[0];
  if (!it) {
    return;
  }
  ttPermintaan.value = it;
  ttList.value = [];
  showTtDialog.value = true;
  await muatTandaTerima();
};

const mintaValidasi = (t: TandaTerimaPermintaanItem) => {
  ttPilih.value = t;
  showKonfirmasiValidasi.value = true;
};

const konfirmasiValidasi = async () => {
  const t = ttPilih.value;
  if (!t) {
    return;
  }
  isActioning.value = true;
  try {
    await permintaanMarkerService.validasiTandaTerima(t.nomor);
    toast.success(`Tanda terima ${t.nomor} divalidasi.`);
    showKonfirmasiValidasi.value = false;
    await muatTandaTerima();
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal memvalidasi tanda terima."));
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
        { header: "SPK", key: "spkNomor", width: 20 },
        { header: "Nama SPK", key: "spkNama", width: 36 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "Deadline", key: "deadline", width: 12 },
        { header: "Tgl Dikerjakan", key: "tglDikerjakan", width: 14 },
        { header: "Tgl LHK", key: "tglLhk", width: 12 },
        { header: "Tgl Mutasi", key: "tglMutasi", width: 12 },
        { header: "Tgl Terima", key: "tglTerima", width: 12 },
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
        spkNomor: r.spkNomor ?? "",
        spkNama: r.spkNama ?? "",
        tanggal: formatTanggal(r.tanggal),
        deadline: formatTanggal(r.deadline),
        tglDikerjakan: r.tglDikerjakan ? tgl(r.tglDikerjakan) : "",
        tglLhk: r.tglLhk ? tgl(r.tglLhk) : "",
        tglMutasi: r.tglMutasi ? tgl(r.tglMutasi) : "",
        tglTerima: r.tglTerima ? tgl(r.tglTerima) : "",
        jmlSpkSelesai: Number(r.jmlSpkSelesai),
        jmlSpk: Number(r.jmlSpk),
        totalJml: Number(r.totalJml) > 0 ? Number(r.totalJml) : "",
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
          jml: Number(r.jml) > 0 ? Number(r.jml) : "",
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
        <input
          type="date"
          v-model="filterStart"
          class="f-date"
          :disabled="modeMenunggu"
        />
        <span class="f-sep">sd</span>
        <input
          type="date"
          v-model="filterEnd"
          class="f-date"
          :disabled="modeMenunggu"
        />
        <span class="f-label ml-2">Status</span>
        <select v-model="filterStatus" class="f-date" :disabled="modeMenunggu">
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
        <label class="f-chk">
          <input type="checkbox" v-model="modeMenunggu" />
          Menunggu validasi saya
        </label>
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
        color="success"
        :disabled="selected.length !== 1 || !(selected[0].jmlTt > 0)"
        @click="bukaTandaTerima"
      >
        <template #prepend><IconReceipt :size="15" /></template>
        Tanda Terima
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

    <template #item.tglDikerjakan="{ item }">
      {{ tgl(item.tglDikerjakan) }}
    </template>

    <template #item.tglLhk="{ item }">
      {{ tgl(item.tglLhk) }}
    </template>

    <template #item.tglMutasi="{ item }">
      {{ tgl(item.tglMutasi) }}
    </template>

    <template #item.tglTerima="{ item }">
      {{ tgl(item.tglTerima) }}
    </template>

    <template #item.jmlSpkSelesai="{ item }">
      {{ item.jmlSpkSelesai }} / {{ item.jmlSpk }}
    </template>

    <template #item.spkNomor="{ item }">
      <template v-if="item.spkNomor">
        <span :title="item.spkNomor">{{ item.spkNomor.split(", ")[0] }}</span>
        <span
          v-if="item.jmlSpk > 1"
          class="spk-more-chip"
          :title="item.spkNomor"
          >+{{ item.jmlSpk - 1 }}</span
        >
      </template>
      <template v-else>-</template>
    </template>

    <template #item.spkNama="{ item }">
      <span class="cell-clip" :title="item.spkNama ?? ''">{{
        item.spkNama || "-"
      }}</span>
    </template>

    <template #item.totalJml="{ item }">
      {{ Number(item.totalJml) > 0 ? fmtJml(item.totalJml) : "-" }}
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
                <th
                  v-if="adaJmlByNomor[item.nomor]"
                  style="width: 110px"
                  class="num"
                >
                  JML MARKER
                </th>
                <th v-if="adaAlasanByNomor[item.nomor]">
                  ALASAN (BAHAN DI LUAR MKB)
                </th>
              </tr>
            </thead>
            <tbody
              v-for="g in kelompokByNomor[item.nomor] ?? []"
              :key="g.spkNomor"
            >
              <tr class="grp-row">
                <td :colspan="jumlahKolom(item.nomor)">
                  {{ g.spkNomor
                  }}<span v-if="g.spkNama"> - {{ g.spkNama }}</span>
                  <span v-if="g.subtotal > 0" class="grp-sub"
                    >{{ fmtJml(g.subtotal) }} marker</span
                  >
                  <span
                    class="grp-lhk"
                    :class="g.lhkNomor ? 'txt-ok' : 'txt-belum'"
                  >
                    {{
                      g.lhkNomor ? `LHK: ${g.lhkNomor}` : "Belum ada LHK Marker"
                    }}
                  </span>
                </td>
              </tr>
              <tr v-for="d in g.rows" :key="d.id">
                <td>{{ d.kode }}</td>
                <td>{{ d.namaBahan }}</td>
                <td>{{ d.satuan }}</td>
                <td>{{ d.setting }}</td>
                <td v-if="adaJmlByNomor[item.nomor]" class="num">
                  {{ Number(d.jml) > 0 ? fmtJml(d.jml) : "-" }}
                </td>
                <td v-if="adaAlasanByNomor[item.nomor]" class="cell-wrap">
                  {{ d.alasan || "-" }}
                </td>
              </tr>
            </tbody>
            <tbody v-if="!(kelompokByNomor[item.nomor] ?? []).length">
              <tr>
                <td :colspan="jumlahKolom(item.nomor)" class="empty-row">
                  &lt;Tidak ada detail&gt;
                </td>
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

  <!-- ─── Dialog Tanda Terima ─── -->
  <v-dialog v-model="showTtDialog" max-width="820">
    <v-card class="rounded-lg">
      <v-card-title class="bg-success text-white pa-3 text-subtitle-1">
        Tanda Terima Marker – {{ ttPermintaan?.nomor }}
      </v-card-title>
      <v-card-text class="pa-3">
        <div v-if="ttLoading" class="tt-info">Memuat...</div>
        <div v-else-if="!ttList.length" class="tt-info">
          Belum ada tanda terima. Tanda terima dibuat otomatis saat LHK Marker
          disimpan.
        </div>
        <table v-else class="dt">
          <thead>
            <tr>
              <th style="width: 150px">NO. TANDA TERIMA</th>
              <th style="width: 150px">LHK</th>
              <th>SPK</th>
              <th style="width: 110px">DISERAHKAN</th>
              <th style="width: 110px">DITERIMA</th>
              <th style="width: 100px" class="ctr">STATUS</th>
              <th style="width: 90px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in ttList" :key="t.nomor">
              <td>{{ t.nomor }}</td>
              <td>{{ t.lhkNomor }}</td>
              <td class="cell-wrap">{{ t.spk || "-" }}</td>
              <td>{{ tgl(t.tglMutasi) }}</td>
              <td>{{ tgl(t.tglTerima) }}</td>
              <td class="ctr">{{ statusTt(t) }}</td>
              <td class="ctr">
                <v-btn
                  v-if="bisaValidasi(t)"
                  size="x-small"
                  color="success"
                  variant="flat"
                  @click="mintaValidasi(t)"
                  >Validasi</v-btn
                >
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="ttList.length" class="tt-catatan">
          Validasi hanya bisa dilakukan oleh pembuat permintaan, setelah tanda
          terima dicetak dan diserahkan oleh pembuat marker.
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-spacer />
        <v-btn variant="text" @click="showTtDialog = false">Tutup</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ─── Konfirmasi Validasi ─── -->
  <v-dialog v-model="showKonfirmasiValidasi" max-width="420" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-success text-white pa-3 text-subtitle-1">
        Validasi Tanda Terima
      </v-card-title>
      <v-card-text class="pa-4">
        Dengan memvalidasi <b>{{ ttPilih?.nomor }}</b
        >, Anda menyatakan hasil marker sudah diterima. Setelah ini LHK Marker
        <b>{{ ttPilih?.lhkNomor }}</b> tidak bisa diubah atau dihapus, dan
        validasi tidak bisa dibatalkan.
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showKonfirmasiValidasi = false"
          >Batal</v-btn
        >
        <v-spacer />
        <v-btn
          color="success"
          variant="elevated"
          :loading="isActioning"
          @click="konfirmasiValidasi"
          >Ya, Validasi</v-btn
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
.cell-clip {
  display: inline-block;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.spk-more-chip {
  display: inline-block;
  margin-left: 4px;
  padding: 0 6px;
  border-radius: 9px;
  background: #fff3e0;
  color: #e65100;
  font-size: 10px;
  font-weight: 700;
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
.dt .grp-row .grp-sub {
  margin-left: 12px;
  font-weight: 400;
  color: #455a64;
}
.dt .grp-row .grp-lhk {
  margin-left: 16px;
  font-weight: 400;
}
.empty-row {
  text-align: center;
  color: #9e9e9e;
  font-style: italic;
  padding: 10px;
  font-size: 11px;
}
.f-chk {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
  white-space: nowrap;
  cursor: pointer;
}
.tt-info {
  font-size: 11px;
  padding: 8px 0;
}
.tt-catatan {
  font-size: 10px;
  color: #757575;
  font-style: italic;
  margin-top: 8px;
}
.dt .ctr,
.dt thead th.ctr {
  text-align: center;
}
</style>
