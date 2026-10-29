<script setup lang="ts">
import { ref, computed, watch, onActivated } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { poBahanService } from "@/services/pembelian/poBahanService";
import {
  IconShoppingCartCopy,
  IconPrinter,
  IconFileExport,
  IconDotsVertical,
  IconLockSquare,
  IconLockOpen,
  IconShieldLock,
  IconSearch,
} from "@tabler/icons-vue";
import {
  formatTanggal,
  formatTanggalJam,
  formatTanggalSingkat,
} from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

// --- STATE FILTER ---
const d = new Date();
const formatDateLocal = (value?: string | Date) => {
  if (!value) return "";

  // YYYY-MM-DD jangan diparse ulang
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const d = new Date(value);

  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const firstDay = formatDateLocal(new Date(d.getFullYear(), d.getMonth(), 1));

const today = formatDateLocal(d);

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
  search: "",
});

// ⚠️ KodeSupplier/Supplier digated flag lihatSup, Harga/Disc (detail)
// digated flag lihatBeli — replikasi `if zLihatSup<>0` / `if
// zLihatBeli=1` di ufrmBrowsePO.
const canLihatSup = computed(() => authStore.user?.flags.lihatSup === 1);
const canLihatBeli = computed(() => authStore.user?.flags.lihatBeli === 1);

// --- STATE DIALOG ---
const closeDialog = ref(false);
const alasanClose = ref("");

const pinDialog = ref(false);
const alasanPin = ref("");

// --- STATE DIALOG CETAK ---
const showPrintDialog = ref(false);

// Ref BaseBrowse: getFilteredItems() = data yang tampil setelah search + filter kolom
const browseRef = ref<{ getFilteredItems: () => any[] } | null>(null);
const tglExport = (v: any) => (v ? formatTanggalSingkat(v) : "");

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
} = useBrowse({
  menuId: "52",
  fetchApi: async () => {
    const res = await poBahanService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      search: filterState.value.search,
    });
    return res.data.data;
  },
  immediate: false, // Kita panggil manual setelah mounted agar filterState siap
});

// --- HEADERS UTAMA ---
const baseHeaders = [
  { title: "Nomor PO", key: "Nomor", width: "140px", fixed: true },
  { title: "Jenis PO", key: "JenisPO", width: "100px" },
  { title: "PO Greige", key: "PoGreige", width: "130px" },
  { title: "PO Celup", key: "PoCelup", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Delivery", key: "Comm_Delivery", width: "100px", align: "center" },
  { title: "Qty PO", key: "QtyPO", width: "100px", align: "right" },
  { title: "Qty BPB", key: "QtyBPB", width: "100px", align: "right" },
  { title: "Qty Retur", key: "QtyRetur", width: "100px", align: "right" },
  { title: "Keterangan", key: "Keterangan", width: "250px" },
];
const supHeaders = [
  { title: "Kode Supplier", key: "KodeSupplier", width: "120px" },
  { title: "Supplier", key: "Supplier", width: "200px" },
];
const tailHeaders = [
  { title: "Note", key: "Note", width: "200px" },
  { title: "Status", key: "Status", width: "100px", align: "center" },
  { title: "Alasan Close", key: "AlasanClose", width: "200px" },
  { title: "Tgl Close", key: "TglClose", width: "140px", align: "center" },
  { title: "Di Close Oleh", key: "DiCloseOleh", width: "120px" },
  { title: "User Create", key: "usr", width: "100px" },
  { title: "Created", key: "Created", width: "140px", align: "center" },
];

const headers = computed(() => [
  ...baseHeaders,
  ...(canLihatSup.value ? supHeaders : []),
  ...tailHeaders,
]);

// --- EXPAND LOGIC (DETAIL PO) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await poBahanService.getBrowseDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal muat detail PO ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- STYLING BARIS (Ala Delphi) ---
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const classes: string[] = ["font-weight-medium"];

  if (item.Status === "OPEN")
    classes.push("text-error"); // Merah
  else if (item.Status === "ONPROSES") classes.push("text-primary"); // Biru
  // CLOSE/DICLOSE → tidak ada class tambahan, default hitam

  return { class: classes.join(" ") };
};

const getNomorStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: white;"; // Biru
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: white;"; // Merah
  if (ngedit === "ACC") return "background-color: #388e3c; color: white;"; // Hijau
  return "";
};

// --- HANDLERS ---
const muatUlang = () => {
  expandedRows.value = [];
  detailCache.value = {};
  return fetchData();
};
onActivated(muatUlang);
watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
// Debounce search agar tidak terlalu sering hit API saat mengetik
let searchTimeout: any;
const onSearchInput = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => fetchData(), 500);
};

const onAdd = () => {
  router.push("/pembelian/po-bahan/create");
};
const onEdit = (item: any) => {
  if (!item || !item.Nomor) return;
  router.push(`/pembelian/po-bahan/edit/${encodeURIComponent(item.Nomor)}`);
};

const onDelete = async (item: any) => {
  try {
    await poBahanService.deleteData(item.Nomor);
    toast.success("PO berhasil dihapus.");
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal menghapus PO.");
  }
};

const onPrint = () => {
  if (!selectedItem.value)
    return toast.warning("Pilih data PO terlebih dahulu.");
  showPrintDialog.value = true;
};

const processPrint = (satuan: string) => {
  showPrintDialog.value = false;
  if (satuan === "BATAL") return;

  const url = router.resolve({
    path: `/pembelian/po-bahan/print/${encodeURIComponent(selectedItem.value.Nomor)}`,
    query: { satuan },
  }).href;
  window.open(url, "_blank");
};

// --- EXPORT HEADER PO (ikut search + filter kolom BaseBrowse) ---
const onExportHeader = async () => {
  const rows = browseRef.value?.getFilteredItems() ?? [];
  if (!rows.length) return toast.warning("Tidak ada data untuk diexport.");

  const data = rows.map((r: any) => ({
    ...r,
    Tanggal: tglExport(r.Tanggal),
    Comm_Delivery: tglExport(r.Comm_Delivery),
    TglClose: tglExport(r.TglClose),
    Created: tglExport(r.Created),
    QtyPO: Number(r.QtyPO) || 0,
    QtyBPB: Number(r.QtyBPB) || 0,
    QtyRetur: Number(r.QtyRetur) || 0,
  }));

  const columns: ExcelColumn[] = [
    { header: "Nomor PO", key: "Nomor", width: 16 },
    { header: "Jenis PO", key: "JenisPO", width: 12, align: "center" },
    { header: "PO Greige", key: "PoGreige", width: 16 },
    { header: "PO Celup", key: "PoCelup", width: 18 },
    { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
    { header: "Delivery", key: "Comm_Delivery", width: 12, align: "center" },
    {
      header: "Qty PO",
      key: "QtyPO",
      width: 12,
      align: "right",
      numFmt: "#,##0.00",
    },
    {
      header: "Qty BPB",
      key: "QtyBPB",
      width: 12,
      align: "right",
      numFmt: "#,##0.00",
    },
    {
      header: "Qty Retur",
      key: "QtyRetur",
      width: 12,
      align: "right",
      numFmt: "#,##0.00",
    },
    { header: "Keterangan", key: "Keterangan", width: 35 },
    ...(canLihatSup.value
      ? [
          { header: "Kode Supplier", key: "KodeSupplier", width: 16 },
          { header: "Supplier", key: "Supplier", width: 28 },
        ]
      : []),
    { header: "Note", key: "Note", width: 30 },
    { header: "Status", key: "Status", width: 12, align: "center" },
    { header: "Alasan Close", key: "AlasanClose", width: 28 },
    { header: "Tgl Close", key: "TglClose", width: 12, align: "center" },
    { header: "Di Close Oleh", key: "DiCloseOleh", width: 14 },
    { header: "User Create", key: "usr", width: 12 },
    { header: "Created", key: "Created", width: 12, align: "center" },
  ];

  try {
    await exportExcelSingle(
      `PO_Bahan_${filterState.value.dtAwal}_to_${filterState.value.dtAkhir}.xlsx`,
      "PO Bahan",
      columns,
      data,
      `PO Bahan | Periode: ${tglExport(filterState.value.dtAwal)} s.d ${tglExport(filterState.value.dtAkhir)}`,
    );
    toast.success("Berhasil export PO Bahan.");
  } catch {
    toast.error("Gagal export PO Bahan.");
  }
};

// --- EXPORT DETAIL PO ---
const isExportingDetail = ref(false);

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await poBahanService.getAllDetail({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      search: filterState.value.search,
    });

    // Hanya PO yang tampil di browse (search + filter kolom BaseBrowse ikut)
    const filteredRows = browseRef.value?.getFilteredItems() ?? [];
    const nomorTampil = new Set<string>(filteredRows.map((r: any) => r.Nomor));
    const noteByNomor = new Map<string, string>(
      filteredRows.map((r: any) => [r.Nomor, r.Note || ""]),
    );
    const allDetail: any[] = (res.data.data || []).filter((r: any) =>
      nomorTampil.has(r.Nomor),
    );

    // ✅ Kelompokkan per Nomor PO
    const groups: Record<string, any[]> = {};
    const order: string[] = [];
    allDetail.forEach((r) => {
      const key = r.Nomor;
      if (!groups[key]) {
        groups[key] = [];
        order.push(key);
      }
      groups[key].push(r);
    });

    const combinedRows: any[] = [];

    order.forEach((key) => {
      const rowsInGroup = groups[key];
      const first = rowsInGroup[0];
      // PO Lain-lain: supplier berbeda per baris, jadi tidak ditaruh di master
      const isLainLain = first.JenisPO === "LAIN-LAIN";

      // Data Header/Master yang hanya muncul di baris pertama
      const masterCells = {
        Nomor: first.Nomor,
        Tanggal: tglExport(first.Tanggal),
        Comm_Delivery: tglExport(first.Comm_Delivery),
        JenisPO: first.JenisPO,
        Keterangan: first.Keterangan || "",
        Note: noteByNomor.get(first.Nomor) ?? "",
        ...(canLihatSup.value && !isLainLain
          ? { Supplier: first.Supplier }
          : {}),
      };

      // Baris blanko untuk detail kedua dan seterusnya
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      rowsInGroup.forEach((r, idx) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          ...(canLihatSup.value && isLainLain ? { Supplier: r.Supplier } : {}),
          Kode: r.Kode,
          Nama: r.Nama,
          Satuan: r.Satuan,
          Jumlah: Number(r.Jumlah) || 0,
          QtyBpb: Number(r.QtyBpb) || 0,
          QtyRetur: Number(r.QtyRetur) || 0,
          Roll: isLainLain ? Number(r.Roll) || 0 : "",
          ...(canLihatBeli.value
            ? {
                Harga: Number(r.Harga) || 0,
                HargaRoll: isLainLain ? Number(r.HargaRoll) || 0 : "",
                Disc: Number(r.Disc) || 0,
                Ppn: Number(r.Ppn) || 0,
              }
            : {}),
          Status_barang: r.Status_barang,
          MKB: r.MKB,
          SPK: r.SPK,
          Nama_SPK: r.Nama_SPK,
        });
      });
    });

    const columns: ExcelColumn[] = [
      { header: "Nomor PO", key: "Nomor", width: 16 },
      { header: "Tanggal", key: "Tanggal", width: 12, align: "center" },
      { header: "Delivery", key: "Comm_Delivery", width: 12, align: "center" },
      { header: "Jenis PO", key: "JenisPO", width: 12, align: "center" },
      { header: "Keterangan", key: "Keterangan", width: 35 },
      { header: "Note", key: "Note", width: 30 },
      ...(canLihatSup.value
        ? [{ header: "Supplier", key: "Supplier", width: 28 }]
        : []),
      { header: "Kode Bahan", key: "Kode", width: 14 },
      { header: "Nama Bahan", key: "Nama", width: 28 },
      { header: "Satuan", key: "Satuan", width: 10, align: "center" },
      {
        header: "Qty PO",
        key: "Jumlah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Qty BPB",
        key: "QtyBpb",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Qty Retur",
        key: "QtyRetur",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Roll",
        key: "Roll",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      ...(canLihatBeli.value
        ? [
            {
              header: "Harga",
              key: "Harga",
              width: 14,
              align: "right",
              numFmt: "#,##0.00",
            },
            {
              header: "Harga Roll",
              key: "HargaRoll",
              width: 14,
              align: "right",
              numFmt: "#,##0.00",
            },
            {
              header: "Disc",
              key: "Disc",
              width: 10,
              align: "right",
              numFmt: "#,##0.00",
            },
            {
              header: "PPN (%)",
              key: "Ppn",
              width: 10,
              align: "right",
              numFmt: "#,##0.00",
            },
          ]
        : []),
      { header: "Status", key: "Status_barang", width: 12, align: "center" },
      { header: "No. MKB", key: "MKB", width: 16 },
      { header: "No. SPK", key: "SPK", width: 16 },
      { header: "Nama SPK", key: "Nama_SPK", width: 28 },
    ];

    await exportExcelSingle(
      `PO_Bahan_Detail_${filterState.value.dtAwal}_to_${filterState.value.dtAkhir}.xlsx`,
      "Detail PO Bahan",
      columns,
      combinedRows,
      `Rincian PO Bahan | Periode: ${tglExport(filterState.value.dtAwal)} s.d ${tglExport(filterState.value.dtAkhir)}`,
    );

    toast.success("Berhasil export detail PO.");
  } catch (err) {
    toast.error("Gagal export detail.");
  } finally {
    isExportingDetail.value = false;
  }
};

// --- HANDLER CLOSE / BATAL CLOSE ---
const openCloseDialog = () => {
  if (!selectedItem.value) return;
  if (
    selectedItem.value.Status === "CLOSE" ||
    selectedItem.value.Status === "DICLOSE"
  ) {
    toast.warning("PO sudah berstatus Close.");
    return;
  }
  alasanClose.value = "";
  closeDialog.value = true;
};

const submitClose = async () => {
  if (!alasanClose.value.trim())
    return toast.error("Alasan close wajib diisi.");
  try {
    await poBahanService.toggleClose({
      nomor: selectedItem.value.Nomor,
      isClose: true,
      alasan: alasanClose.value,
    });
    toast.success("PO berhasil di-close manual.");
    closeDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal close PO.");
  }
};

const onBatalClose = async () => {
  if (!selectedItem.value) return;
  if (
    selectedItem.value.Status !== "DICLOSE" &&
    selectedItem.value.Status !== "CLOSE"
  ) {
    return toast.warning("PO ini belum berstatus Close.");
  }
  if (
    confirm(
      `Yakin ingin membatalkan Close untuk PO ${selectedItem.value.Nomor}?`,
    )
  ) {
    try {
      await poBahanService.toggleClose({
        nomor: selectedItem.value.Nomor,
        isClose: false,
      });
      toast.success("Status Close PO berhasil dibatalkan.");
      fetchData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Gagal membatalkan close.");
    }
  }
};

// --- HANDLER PENGAJUAN PIN ---
const openPinDialog = () => {
  if (!selectedItem.value) return;
  alasanPin.value = "";
  pinDialog.value = true;
};

const submitPin = async () => {
  if (!alasanPin.value.trim())
    return toast.error("Alasan pengajuan wajib diisi.");
  try {
    await poBahanService.requestPinEdit({
      nomor: selectedItem.value.Nomor,
      alasan: alasanPin.value,
    });
    toast.success("Pengajuan perubahan data berhasil dikirim.");
    pinDialog.value = false;
    fetchData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal mengirim pengajuan.");
  }
};

// Formatting helpers
const numFmt = (v: any) => (v ? Number(v).toLocaleString("id-ID") : "0");

// --- SUMMARY FOOTER FORMATTERS ---
const summaryFormatters = {
  // Label Total ditaruh di kolom Delivery (tepat sebelum Qty PO)
  Comm_Delivery: () => "TOTAL :",
  QtyPO: (items: any[]) =>
    numFmt(items.reduce((sum, item) => sum + (Number(item.QtyPO) || 0), 0)),
  QtyBPB: (items: any[]) =>
    numFmt(items.reduce((sum, item) => sum + (Number(item.QtyBPB) || 0), 0)),
};
</script>

<template>
  <BaseBrowse
    ref="browseRef"
    title="PO Bahan"
    menu-id="52"
    :icon="IconShoppingCartCopy"
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
    :row-props-fn="rowPropsFn"
    @add="onAdd"
    @edit="onEdit"
    @delete="onDelete"
    @refresh="muatUlang"
    @export="onExportHeader"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
    :summary-columns="['QtyPO', 'QtyBPB']"
    :summary-formatters="summaryFormatters"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="legend-container">
        <div class="legend-item"><span class="l-box bg-error"></span> OPEN</div>
        <div class="legend-item">
          <span class="l-box bg-primary"></span> ONProses
        </div>
        <div class="f-divider" style="height: 14px; margin: 0 4px" />
        <span class="f-label text-grey">Back Color:</span>
        <div class="legend-item">
          <span class="l-box bg-blue-darken-2"></span> Nunggu Acc
        </div>
        <div class="legend-item">
          <span class="l-box bg-green-darken-2"></span> Sudah Acc
        </div>
        <div class="legend-item">
          <span class="l-box bg-red-darken-2"></span> Tolak
        </div>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <div class="search-box">
          <IconSearch :size="14" class="text-grey" />
          <input
            type="text"
            v-model="filterState.search"
            @input="onSearchInput"
            placeholder="Cari Nama Bahan / Keterangan..."
            class="f-search-inp"
          />
        </div>
      </div>
    </template>

    <template #item.Nomor="{ item }">
      <div class="nomor-cell" :style="getNomorStyle(item.Ngedit)">
        {{ item.Nomor }}
      </div>
    </template>

    <template #item.Tanggal="{ item }">{{
      formatTanggal(item.Tanggal)
    }}</template>
    <template #item.Comm_Delivery="{ item }">{{
      formatTanggal(item.Comm_Delivery)
    }}</template>
    <template #item.TglClose="{ item }">{{
      formatTanggal(item.TglClose)
    }}</template>
    <template #item.Created="{ item }">{{
      formatTanggalJam(item.Created)
    }}</template>

    <template #item.QtyPO="{ item }">{{ numFmt(item.QtyPO) }}</template>
    <template #item.QtyBPB="{ item }">{{ numFmt(item.QtyBPB) }}</template>
    <template #item.QtyRetur="{ item }">{{ numFmt(item.QtyRetur) }}</template>

    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">
            Detail PO Bahan - {{ item.Nomor }}
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="100">Kode Bahan</th>
                <th>Nama Bahan</th>
                <th width="80" class="text-center">Satuan</th>
                <th width="100" class="tr">Qty PO</th>
                <th width="100" class="tr">Qty BPB</th>
                <th width="100" class="tr">Qty Retur</th>
                <th v-if="item.JenisPO === 'LAIN-LAIN'" width="70" class="tr">
                  Roll
                </th>
                <th v-if="canLihatBeli" width="100" class="tr">Harga</th>
                <th
                  v-if="canLihatBeli && item.JenisPO === 'LAIN-LAIN'"
                  width="100"
                  class="tr"
                >
                  Harga Roll
                </th>
                <th v-if="canLihatBeli" width="80" class="tr">Disc</th>
                <th v-if="canLihatBeli" width="70" class="tr">PPN (%)</th>
                <th width="80" class="text-center">Status</th>
                <th width="120">No. MKB</th>
                <th width="120">No. SPK</th>
                <th width="200">Nama SPK</th>
                <th
                  v-if="canLihatSup && item.JenisPO === 'LAIN-LAIN'"
                  width="180"
                >
                  Supplier
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(d, i) in detailCache[item.Nomor]" :key="i">
                <td>{{ d.Kode }}</td>
                <td class="font-weight-bold">{{ d.Nama }}</td>
                <td class="text-center">{{ d.Satuan }}</td>
                <td class="tr text-blue-darken-2 font-weight-bold">
                  {{ numFmt(d.Jumlah) }}
                </td>
                <td class="tr">{{ numFmt(d.QtyBpb) }}</td>
                <td class="tr text-error">{{ numFmt(d.QtyRetur) }}</td>
                <td v-if="item.JenisPO === 'LAIN-LAIN'" class="tr">
                  {{ numFmt(d.Roll) }}
                </td>
                <td v-if="canLihatBeli" class="tr">{{ numFmt(d.Harga) }}</td>
                <td
                  v-if="canLihatBeli && item.JenisPO === 'LAIN-LAIN'"
                  class="tr"
                >
                  {{ numFmt(d.HargaRoll) }}
                </td>
                <td v-if="canLihatBeli" class="tr">{{ numFmt(d.Disc) }}</td>
                <td v-if="canLihatBeli" class="tr">{{ numFmt(d.Ppn) }}</td>
                <td class="text-center">
                  <v-chip
                    size="x-small"
                    :color="
                      d.Status_barang === 'True'
                        ? 'success'
                        : d.Status_barang === 'Delay'
                          ? 'warning'
                          : 'error'
                    "
                  >
                    {{ d.Status_barang }}
                  </v-chip>
                </td>
                <td>{{ d.MKB || "-" }}</td>
                <td>{{ d.SPK || "-" }}</td>
                <td>{{ d.Nama_SPK || "-" }}</td>
                <td v-if="canLihatSup && item.JenisPO === 'LAIN-LAIN'">
                  {{ d.Supplier || "-" }}
                </td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td colspan="11" class="text-center text-grey py-3 font-italic">
                  Detail PO tidak ditemukan.
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
      <v-btn
        v-if="canExport"
        size="small"
        color="deep-purple-darken-1"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend><IconFileExport :size="15" /></template>
        Export Detail
      </v-btn>

      <v-menu v-if="selected.length > 0">
        <template #activator="{ props }">
          <v-btn size="small" color="teal-darken-3" v-bind="props">
            <template #prepend><IconDotsVertical :size="15" /></template
            >Tindakan
          </v-btn>
        </template>
        <v-list density="compact" class="text-caption">
          <v-list-item @click="openPinDialog">
            <template #prepend
              ><IconShieldLock :size="14" class="mr-2 text-primary"
            /></template>
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
          <v-divider class="my-1"></v-divider>
          <v-list-item @click="openCloseDialog" :disabled="!canEdit">
            <template #prepend
              ><IconLockSquare :size="14" class="mr-2 text-warning"
            /></template>
            <v-list-item-title>Close PO Manual</v-list-item-title>
          </v-list-item>
          <v-list-item @click="onBatalClose" :disabled="!canEdit">
            <template #prepend
              ><IconLockOpen :size="14" class="mr-2 text-error"
            /></template>
            <v-list-item-title>Batal Close</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </BaseBrowse>

  <v-dialog v-model="pinDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1"
        >Pengajuan Perubahan Data</v-card-title
      >
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          Nomor PO: <b>{{ selectedItem?.Nomor }}</b>
        </p>
        <v-textarea
          v-model="alasanPin"
          label="Alasan Perubahan"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="pinDialog = false">Batal</v-btn>
        <v-btn color="primary" variant="elevated" @click="submitPin"
          >Ajukan</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="closeDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-warning text-white pa-3 text-subtitle-1"
        >Close PO Manual</v-card-title
      >
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          Menutup PO Nomor: <b>{{ selectedItem?.Nomor }}</b>
        </p>
        <v-textarea
          v-model="alasanClose"
          label="Alasan Close"
          variant="outlined"
          density="compact"
          rows="3"
          hide-details
          autofocus
        />
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog = false">Batal</v-btn>
        <v-btn color="warning" variant="elevated" @click="submitClose"
          >Proses Close</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Dialog Konfirmasi Cetak -->
  <v-dialog v-model="showPrintDialog" max-width="350" persistent>
    <v-card class="rounded-xl pa-2">
      <v-card-text class="text-center pt-6 pb-4">
        <!-- Ikon Printer Besar -->
        <v-icon size="64" color="primary" class="mb-3"
          >mdi-printer-outline</v-icon
        >

        <h3 class="text-h6 font-weight-bold mb-1 text-grey-darken-4">
          Konfirmasi Cetak
        </h3>
        <p class="text-body-2 text-grey-darken-1 mb-6">
          Pilih format satuan untuk mencetak dokumen PO Bahan ini.
        </p>

        <!-- Tombol Pilihan -->
        <div class="d-flex justify-center mb-2" style="gap: 12px">
          <v-btn
            color="primary"
            variant="elevated"
            @click="processPrint('METER')"
            min-width="100"
            class="text-button font-weight-bold"
            >METER</v-btn
          >
          <v-btn
            color="blue-grey-darken-2"
            variant="elevated"
            @click="processPrint('YARD')"
            min-width="100"
            class="text-button font-weight-bold"
            >YARD</v-btn
          >
        </div>

        <!-- Tombol Batal -->
        <v-btn
          color="error"
          variant="text"
          class="w-100 mt-2 font-weight-bold"
          @click="showPrintDialog = false"
          >BATAL</v-btn
        >
      </v-card-text>
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
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}

.search-box {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 8px;
  height: 28px;
  width: 220px;
}
.f-search-inp {
  border: none;
  outline: none;
  font-size: 11px;
  padding-left: 6px;
  width: 100%;
}

/* --- Keterangan Warna (Legend) --- */
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

.nomor-cell {
  padding: 2px 8px;
  border-radius: 4px;
  font-family: monospace;
  display: inline-block;
  min-width: 100%;
  font-weight: bold;
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
