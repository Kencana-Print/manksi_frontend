<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import {
  IconCalendarDue,
  IconTrash,
  IconBan,
  IconFileExport,
} from "@tabler/icons-vue";
import {
  exportExcel,
  exportExcelSingle,
  type ExcelColumn,
  type ExcelSheetConfig,
} from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import {
  rekapPembayaranService,
  pesanError,
  type RekapBrowseItem,
  type RekapDetailRow,
} from "@/services/piutang/rekapPembayaranService";

interface RowCtx {
  item: RekapBrowseItem & { raw?: RekapBrowseItem };
}
interface KelompokKategori {
  kategori: string;
  subtotal: number;
  rows: RekapDetailRow[];
}

const toast = useToast();
const router = useRouter();
const browseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// ─── Helpers ──────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const fmtNominal = (v: number | string | null | undefined): string =>
  Number(v ?? 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];
const formatBulan = (ym: string): string => {
  const [y, m] = (ym || "").split("-");
  const nama = NAMA_BULAN[Number(m) - 1];
  return nama ? `${nama} ${y}` : ym || "-";
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
const items = ref<RekapBrowseItem[]>([]);
const isLoading = ref(false);
const selected = ref<RekapBrowseItem[]>([]);
const expandedRows = ref<RekapBrowseItem[]>([]);

// Detail seluruh rentang tanggal diambil sekali (lazy), dipakai expand + Export Detail
const detailRows = ref<RekapDetailRow[]>([]);
const detailLoaded = ref(false);
const detailLoading = ref(false);
let detailReq = 0;

const detailByNomor = computed<Record<string, RekapDetailRow[]>>(() => {
  const map: Record<string, RekapDetailRow[]> = {};
  for (const r of detailRows.value) {
    if (!map[r.nomor]) {
      map[r.nomor] = [];
    }
    map[r.nomor].push(r);
  }
  return map;
});

// Per dokumen: kategori (urutan Excel) lalu supplier, subtotal per kategori
const kelompokByNomor = computed<Record<string, KelompokKategori[]>>(() => {
  const hasil: Record<string, KelompokKategori[]> = {};
  for (const [nomor, rows] of Object.entries(detailByNomor.value)) {
    const urut = [...rows].sort(
      (a, b) =>
        a.kategoriUrut - b.kategoriUrut ||
        a.namaSupplier.localeCompare(b.namaSupplier) ||
        a.bulanTagihan.localeCompare(b.bulanTagihan) ||
        a.noUrut - b.noUrut,
    );
    const peta = new Map<string, KelompokKategori>();
    for (const r of urut) {
      const g = peta.get(r.kategori) ?? {
        kategori: r.kategori,
        subtotal: 0,
        rows: [],
      };
      g.rows.push(r);
      g.subtotal += Number(r.nominal);
      peta.set(r.kategori, g);
    }
    hasil[nomor] = [...peta.values()];
  }
  return hasil;
});

const showBatalDialog = ref(false);
const showDeleteDialog = ref(false);
const alasanBatal = ref("");
const isActioning = ref(false);
const selectedItem = ref<RekapBrowseItem | null>(null);
const isExportingDetail = ref(false);
const isExportingBulanan = ref(false);

// ─── Headers ──────────────────────────────────────────────
const headers = [
  { title: "NOMOR REKAP", key: "nomor", width: "190px" },
  { title: "TANGGAL", key: "tanggal", width: "100px", align: "center" },
  { title: "SUPPLIER", key: "jumlahSupplier", width: "100px", align: "center" },
  {
    title: "TRANSAKSI",
    key: "jumlahTransaksi",
    width: "100px",
    align: "center",
  },
  { title: "TOTAL NOMINAL", key: "totalNominal", width: "170px", align: "end" },
  { title: "KETERANGAN", key: "keterangan" },
  { title: "STATUS", key: "status", width: "90px", align: "center" },
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
    const res = await rekapPembayaranService.getBrowse({
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

const ensureDetail = async (): Promise<boolean> => {
  if (detailLoaded.value) {
    return true;
  }
  const myReq = ++detailReq;
  detailLoading.value = true;
  try {
    const res = await rekapPembayaranService.getDetail({
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
const handleExpand = async (newExpanded: RekapBrowseItem[]) => {
  expandedRows.value = newExpanded;
  if (newExpanded.length && !detailLoaded.value && !detailLoading.value) {
    await ensureDetail();
  }
};

// ─── Row props: warnai TEKS; rekap BATAL abu-abu dicoret ───
const rowPropsFn = (data: RowCtx) => {
  const item = data.item.raw ?? data.item;
  if (item.status === "BATAL") {
    return {
      style: "color: #9e9e9e !important; text-decoration: line-through;",
    };
  }
  return {};
};

// ─── Batal ────────────────────────────────────────────────
const openBatalDialog = () => {
  if (selected.value.length !== 1) {
    return;
  }
  selectedItem.value = selected.value[0];
  alasanBatal.value = "";
  showBatalDialog.value = true;
};

const confirmBatal = async () => {
  if (!selectedItem.value) {
    return;
  }
  if (!alasanBatal.value.trim()) {
    toast.warning("Alasan batal wajib diisi.");
    return;
  }
  isActioning.value = true;
  try {
    await rekapPembayaranService.batalData(
      selectedItem.value.nomor,
      alasanBatal.value.trim(),
    );
    toast.success("Rekap pembayaran dibatalkan.");
    showBatalDialog.value = false;
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal membatalkan."));
  } finally {
    isActioning.value = false;
  }
};

// ─── Hapus ────────────────────────────────────────────────
const openDeleteDialog = () => {
  if (selected.value.length !== 1) {
    return;
  }
  selectedItem.value = selected.value[0];
  showDeleteDialog.value = true;
};

const confirmDelete = async () => {
  if (!selectedItem.value) {
    return;
  }
  isActioning.value = true;
  try {
    await rekapPembayaranService.deleteData(selectedItem.value.nomor);
    toast.success("Rekap pembayaran berhasil dihapus.");
    showDeleteDialog.value = false;
    fetchData();
  } catch (e) {
    toast.error(pesanError(e, "Gagal menghapus."));
  } finally {
    isActioning.value = false;
  }
};

// ─── Export ───────────────────────────────────────────────
const dataTampil = (): RekapBrowseItem[] =>
  (browseRef.value?.getFilteredItems() as RekapBrowseItem[] | undefined) ??
  items.value;

const doExportMaster = async () => {
  const rows = dataTampil();
  if (!rows.length) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  try {
    await exportExcelSingle(
      `RekapPembayaran_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Rekap Pembayaran",
      [
        { header: "Nomor Rekap", key: "nomor", width: 22 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        {
          header: "Jumlah Supplier",
          key: "jumlahSupplier",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Jumlah Transaksi",
          key: "jumlahTransaksi",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Total Nominal",
          key: "totalNominal",
          width: 20,
          align: "right",
          numFmt: "#,##0.00",
        },
        { header: "Status", key: "status", width: 10 },
        { header: "Keterangan", key: "keterangan", width: 40 },
      ],
      rows.map((r) => ({
        nomor: r.nomor,
        tanggal: formatTanggal(r.tanggal),
        jumlahSupplier: Number(r.jumlahSupplier),
        jumlahTransaksi: Number(r.jumlahTransaksi),
        totalNominal: Number(r.totalNominal),
        status: r.status,
        keterangan: r.keterangan,
      })),
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export."));
  }
};

const doExportDetail = async () => {
  const nomorTampil = new Set(dataTampil().map((r) => r.nomor));
  if (!nomorTampil.size) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExportingDetail.value = true;
  try {
    const ok = await ensureDetail();
    if (!ok) {
      return;
    }
    const rows = detailRows.value.filter((r) => nomorTampil.has(r.nomor));
    if (!rows.length) {
      toast.warning("Tidak ada transaksi untuk diekspor.");
      return;
    }
    await exportExcelSingle(
      `RekapPembayaranDetail_${filterStart.value}_${filterEnd.value}.xlsx`,
      "Detail Rekap Pembayaran",
      [
        { header: "Nomor Rekap", key: "nomor", width: 22 },
        { header: "Tanggal", key: "tanggal", width: 12 },
        { header: "Status", key: "status", width: 10 },
        { header: "Kategori", key: "kategori", width: 18 },
        { header: "Kode Supplier", key: "kodeSupplier", width: 14 },
        { header: "Nama Supplier", key: "namaSupplier", width: 32 },
        { header: "Bulan Tagihan", key: "bulanTagihan", width: 16 },
        { header: "No", key: "noUrut", align: "right", width: 6 },
        { header: "Tipe", key: "tipe", width: 8 },
        { header: "Nomor Nota", key: "nota", width: 20 },
        { header: "Tgl Nota", key: "tglNota", width: 12 },
        {
          header: "Sisa Nota",
          key: "nilaiNota",
          width: 18,
          align: "right",
          numFmt: "#,##0.00",
        },
        {
          header: "Nominal Rencana",
          key: "nominal",
          width: 18,
          align: "right",
          numFmt: "#,##0.00",
        },
        { header: "Tgl Rencana Bayar", key: "tglRencana", width: 16 },
        { header: "Faktur Pajak", key: "fakturPajak", width: 24 },
        { header: "Invoice Tagihan", key: "invoice", width: 24 },
        { header: "No Voucher", key: "vouNomor", width: 18 },
        { header: "Keterangan", key: "keterangan", width: 36 },
      ],
      rows.map((r) => ({
        nomor: r.nomor,
        tanggal: formatTanggal(r.tanggal),
        status: r.status,
        kategori: r.kategori,
        kodeSupplier: r.kodeSupplier,
        namaSupplier: r.namaSupplier,
        bulanTagihan: formatBulan(r.bulanTagihan),
        noUrut: r.noUrut,
        tipe: r.tipe,
        nota: r.nota,
        tglNota: r.tglNota ? formatTanggal(r.tglNota) : "",
        nilaiNota: Number(r.nilaiNota),
        nominal: Number(r.nominal),
        tglRencana: r.tglRencana ? formatTanggal(r.tglRencana) : "",
        fakturPajak: r.fakturPajak,
        invoice: r.invoice,
        keterangan: r.keterangan,
        vouNomor: r.vouNomor,
      })),
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export detail."));
  } finally {
    isExportingDetail.value = false;
  }
};

// ─── Navigasi form ────────────────────────────────────────
const onAdd = () => {
  router.push({ name: "RekapPembayaranCreate" });
};

const onEdit = () => {
  const it = selected.value[0];
  if (!it) {
    return;
  }
  if (it.status !== "AKTIF") {
    toast.warning("Rekap yang sudah dibatalkan tidak dapat diubah.");
    return;
  }
  router.push({ name: "RekapPembayaranEdit", params: { nomor: it.nomor } });
};

// ─── Export Bulanan: satu sheet per bulan tagihan ─────────
interface BarisBulanan {
  kategori: string;
  nomor: string;
  tanggal: string;
  kodeSupplier: string;
  namaSupplier: string;
  status: string;
  tipe: string;
  nota: string;
  tglNota: string;
  sisaNota: number | null;
  nominal: number;
  tglRencana: string;
  fakturPajak: string;
  invoice: string;
  keterangan: string;
  isTotal: boolean;
}

const kolomBulanan: ExcelColumn[] = [
  { header: "Kategori", key: "kategori", width: 18 },
  { header: "Nomor Rekap", key: "nomor", width: 22 },
  { header: "Tanggal", key: "tanggal", width: 12 },
  { header: "Kode Supplier", key: "kodeSupplier", width: 14 },
  { header: "Nama Supplier", key: "namaSupplier", width: 32 },
  { header: "Status", key: "status", width: 10 },
  { header: "Tipe", key: "tipe", width: 8 },
  { header: "Nomor Nota", key: "nota", width: 20 },
  { header: "Tgl Nota", key: "tglNota", width: 12 },
  {
    header: "Sisa Nota",
    key: "sisaNota",
    width: 18,
    align: "right",
    numFmt: "#,##0.00",
  },
  {
    header: "Nominal Rencana",
    key: "nominal",
    width: 18,
    align: "right",
    numFmt: "#,##0.00",
  },
  { header: "Tgl Rencana Bayar", key: "tglRencana", width: 16 },
  { header: "Faktur Pajak", key: "fakturPajak", width: 24 },
  { header: "Invoice Tagihan", key: "invoice", width: 24 },
  { header: "Keterangan", key: "keterangan", width: 36 },
];

const doExportBulanan = async () => {
  const nomorTampil = new Set(dataTampil().map((r) => r.nomor));
  if (!nomorTampil.size) {
    toast.warning("Tidak ada data untuk diekspor.");
    return;
  }
  isExportingBulanan.value = true;
  try {
    if (!(await ensureDetail())) {
      return;
    }
    const perBulan = new Map<string, RekapDetailRow[]>();
    for (const r of detailRows.value) {
      if (!nomorTampil.has(r.nomor)) {
        continue;
      }
      const list = perBulan.get(r.bulanTagihan) ?? [];
      list.push(r);
      perBulan.set(r.bulanTagihan, list);
    }
    if (!perBulan.size) {
      toast.warning("Tidak ada transaksi untuk diekspor.");
      return;
    }

    const sheets: ExcelSheetConfig[] = [...perBulan.keys()]
      .sort()
      .map((bulan) => {
        const list = [...(perBulan.get(bulan) ?? [])].sort(
          (a, b) =>
            a.kategoriUrut - b.kategoriUrut ||
            a.namaSupplier.localeCompare(b.namaSupplier) ||
            a.nomor.localeCompare(b.nomor) ||
            a.noUrut - b.noUrut,
        );
        const rows: BarisBulanan[] = list.map((r) => ({
          kategori: r.kategori,
          nomor: r.nomor,
          tanggal: formatTanggal(r.tanggal),
          kodeSupplier: r.kodeSupplier,
          namaSupplier: r.namaSupplier,
          status: r.status,
          tipe: r.tipe,
          nota: r.nota,
          tglNota: r.tglNota ? formatTanggal(r.tglNota) : "",
          sisaNota: Number(r.nilaiNota),
          nominal: Number(r.nominal),
          tglRencana: r.tglRencana ? formatTanggal(r.tglRencana) : "",
          fakturPajak: r.fakturPajak,
          invoice: r.invoice,
          keterangan: r.keterangan,
          isTotal: false,
        }));
        // Total hanya rekap AKTIF; rekap BATAL tetap tampil tapi tidak dijumlah
        const totalAktif =
          Math.round(
            list
              .filter((r) => r.status === "AKTIF")
              .reduce((s, r) => s + Number(r.nominal), 0) * 100,
          ) / 100;
        rows.push({
          kategori: "",
          nomor: "",
          tanggal: "",
          kodeSupplier: "",
          namaSupplier: "",
          status: "",
          tipe: "",
          nota: "",
          tglNota: "",
          sisaNota: null,
          nominal: totalAktif,
          tglRencana: "",
          fakturPajak: "",
          invoice: "",
          keterangan: "TOTAL (rekap AKTIF)",
          isTotal: true,
        });
        return {
          sheetName: formatBulan(bulan).slice(0, 31),
          columns: kolomBulanan,
          rows,
          rowStyleFn: (row: BarisBulanan) => {
            if (row.isTotal) {
              return { bold: true, fillColor: "E3F2FD" };
            }
            return row.status === "BATAL" ? { fontColor: "9E9E9E" } : null;
          },
        };
      });

    await exportExcel(
      `RekapPembayaranBulanan_${filterStart.value}_${filterEnd.value}.xlsx`,
      sheets,
    );
  } catch (e) {
    toast.error(pesanError(e, "Gagal export bulanan."));
  } finally {
    isExportingBulanan.value = false;
  }
};

// ─── Init ─────────────────────────────────────────────────
fetchData();
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="Rekap Pembayaran"
    menu-id="970"
    :icon="IconCalendarDue"
    :headers="headers"
    :items="items"
    :is-loading="isLoading"
    v-model:selected="selected"
    :expanded="expandedRows"
    @update:expanded="handleExpand"
    show-expand
    :can-insert="true"
    :can-edit="true"
    :can-delete="false"
    :can-export="true"
    item-value="nomor"
    :row-props-fn="rowPropsFn"
    :filter-state="filterState"
    @update:filter-state="onFilterStateRestored"
    @refresh="fetchData"
    @add="onAdd"
    @edit="onEdit"
    @export="doExportMaster"
  >
    <!-- ─── Filter ─── -->
    <template #filter-left>
      <div class="date-filter">
        <span class="f-label">Tanggal Rekap</span>
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
    </template>

    <!-- ─── Extra actions ─── -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="warning"
        :disabled="selected.length !== 1 || selected[0].status !== 'AKTIF'"
        @click="openBatalDialog"
      >
        <template #prepend><IconBan :size="15" /></template>
        Batal
      </v-btn>
      <v-btn
        size="small"
        color="error"
        :disabled="selected.length !== 1 || selected[0].status !== 'AKTIF'"
        @click="openDeleteDialog"
      >
        <template #prepend><IconTrash :size="15" /></template>
        Hapus
      </v-btn>
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
        color="teal-darken-1"
        :loading="isExportingBulanan"
        @click="doExportBulanan"
      >
        <template #prepend><IconFileExport :size="14" /></template>Export
        Bulanan
      </v-btn>
    </template>

    <template #item.tanggal="{ item }">
      {{ formatTanggal(item.tanggal) }}
    </template>

    <template #item.totalNominal="{ item }">
      {{ fmtNominal(item.totalNominal) }}
    </template>

    <template #item.status="{ item }">
      <v-chip
        size="x-small"
        :color="item.status === 'AKTIF' ? 'success' : 'grey'"
        variant="flat"
        class="font-weight-bold"
      >
        {{ item.status }}
      </v-chip>
    </template>

    <!-- ─── Expand: transaksi per kategori ─── -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <div v-if="detailLoading && !detailLoaded" class="expand-loading">
          <v-progress-circular indeterminate color="primary" size="20" />
          <span>Memuat detail...</span>
        </div>

        <template v-else-if="detailLoaded">
          <div v-if="item.keterangan" class="expand-info">
            <b>Keterangan:</b> {{ item.keterangan }}
          </div>
          <div v-if="item.status === 'BATAL'" class="expand-info txt-batal">
            <b>Alasan batal:</b> {{ item.alasanBatal || "-" }}
          </div>
          <table class="dt">
            <thead>
              <tr>
                <th style="width: 230px">SUPPLIER</th>
                <th style="width: 140px">BULAN TAGIHAN</th>
                <th style="width: 60px">TIPE</th>
                <th style="width: 170px">NOMOR NOTA</th>
                <th style="width: 100px">TGL NOTA</th>
                <th style="width: 140px" class="num">SISA NOTA</th>
                <th style="width: 150px" class="num">NOMINAL RENCANA</th>
                <th style="width: 110px">TGL RENCANA</th>
                <th style="width: 170px">FAKTUR PAJAK</th>
                <th style="width: 170px">INVOICE TAGIHAN</th>
                <th style="width: 150px">VOUCHER</th>
                <th>KETERANGAN</th>
              </tr>
            </thead>
            <tbody
              v-for="g in kelompokByNomor[item.nomor] ?? []"
              :key="g.kategori"
            >
              <tr class="grp-row">
                <td colspan="6">{{ g.kategori }}</td>
                <td class="num">{{ fmtNominal(g.subtotal) }}</td>
                <td colspan="5"></td>
              </tr>
              <tr v-for="d in g.rows" :key="d.noUrut">
                <td>{{ d.namaSupplier }}</td>
                <td>{{ formatBulan(d.bulanTagihan) }}</td>
                <td>{{ d.tipe }}</td>
                <td>{{ d.nota }}</td>
                <td>{{ d.tglNota ? formatTanggal(d.tglNota) : "-" }}</td>
                <td class="num">{{ fmtNominal(d.nilaiNota) }}</td>
                <td class="num">{{ fmtNominal(d.nominal) }}</td>
                <td>{{ d.tglRencana ? formatTanggal(d.tglRencana) : "-" }}</td>
                <td>{{ d.fakturPajak || "-" }}</td>
                <td>{{ d.invoice || "-" }}</td>
                <td>{{ d.vouNomor || "-" }}</td>
                <td class="cell-wrap">{{ d.keterangan || "-" }}</td>
              </tr>
            </tbody>
            <tbody v-if="!(kelompokByNomor[item.nomor] ?? []).length">
              <tr>
                <td colspan="12" class="empty-row">
                  &lt;Tidak ada transaksi&gt;
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <div v-else class="expand-empty">Tidak ada data detail.</div>
      </div>
    </template>
  </BaseBrowse>

  <!-- ─── Dialog Batal ─── -->
  <v-dialog v-model="showBatalDialog" max-width="440" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-warning text-white pa-3 text-subtitle-1">
        Batalkan Rekap Pembayaran
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="mb-3">
          Rekap <b>{{ selectedItem?.nomor }}</b> akan dibatalkan dan nota di
          dalamnya bebas direkap ulang. Lanjutkan?
        </div>
        <v-textarea
          v-model="alasanBatal"
          label="Alasan batal (wajib)"
          rows="2"
          auto-grow
          density="compact"
          variant="outlined"
          maxlength="200"
          counter
          hide-details="auto"
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showBatalDialog = false">Tutup</v-btn>
        <v-spacer />
        <v-btn
          color="warning"
          variant="elevated"
          :loading="isActioning"
          @click="confirmBatal"
          >Ya, Batalkan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- ─── Dialog Hapus ─── -->
  <v-dialog v-model="showDeleteDialog" max-width="400" persistent>
    <v-card class="rounded-lg">
      <v-card-title class="bg-error text-white pa-3 text-subtitle-1">
        Konfirmasi Hapus
      </v-card-title>
      <v-card-text class="pa-4">
        Yakin ingin menghapus rekap <b>{{ selectedItem?.nomor }}</b
        >? Seluruh transaksinya ikut terhapus dan tidak bisa dipulihkan.
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <v-btn variant="text" @click="showDeleteDialog = false">Batal</v-btn>
        <v-spacer />
        <v-btn
          color="error"
          variant="elevated"
          :loading="isActioning"
          @click="confirmDelete"
          >Ya, Hapus</v-btn
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
