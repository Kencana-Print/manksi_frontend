<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import {
  qcBahanService,
  type QcLanjutGudang,
} from "@/services/garmen/qcBahanService";
import {
  IconClipboardCheck,
  IconDotsVertical,
  IconShieldLock,
  IconSearch,
  IconSend,
  IconPrinter,
  IconFileSpreadsheet,
} from "@tabler/icons-vue";
import { formatTanggal, formatTanggalJam } from "@/utils/dateFormat";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";

interface QcBahanRow {
  Nomor: string;
  TglDatang: string;
  Nomor_PO: string;
  VendorGreige: string;
  JenisKain: string;
  VendorCelup: string;
  Status: string;
  Keterangan: string | null;
  JumlahLot: number;
  TotalKg: number;
  TotalRoll: number;
  Satuan: string;
  NilaiMin: number;
  Usr: string;
  Created: string;
  Ngedit: string;
  Lots: { Lot: string; Nilai: number; Keputusan: string }[];
}

interface QcBahanRollRow {
  Nourut: number;
  NoRoll: string;
  Qty: number;
  GramasiAtas: number;
  GramasiBawah: number;
  SettingCek: number;
  HGramasi: string;
  HSetting: string;
  Warna: string;
  Handfeel: string;
  Bowing: string;
  Shrinkage: string;
  Kelunturan: string;
  Nilai: number;
  Catatan: string | null;
}

interface QcBahanDetailRow {
  Nourut: number;
  Lot: string;
  Kg: number;
  Satuan: string;
  Roll: number;
  RollCek: number;
  GramasiPO: string;
  SettingPO: string;
  Warna: string;
  GramasiCek: number;
  SettingCek: string;
  Nilai: number;
  Keputusan: string;
  Rolls: QcBahanRollRow[];
}

const router = useRouter();
const toast = useToast();

// --- STATE FILTER ---
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const now = new Date();
const firstDay = toLocalDateStr(new Date(now.getFullYear(), now.getMonth(), 1));
const today = toLocalDateStr(now);

const STATUS_OPTIONS = [
  "ALL",
  "DRAFT",
  "MENUNGGU",
  "LANJUT",
  "REJECT",
  "SEBAGIAN",
  "TUNDA",
];

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
  status: "ALL",
  search: "",
});

// --- STATE DIALOG ---
const pinDialog = ref(false);
const alasanPin = ref("");

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
  menuId: "186",
  fetchApi: async () => {
    const res = await qcBahanService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      status: filterState.value.status,
    });
    return res.data.data;
  },
  immediate: false,
});

// Pencarian sisi klien
const filteredItems = computed<QcBahanRow[]>(() => {
  const rows = (items.value ?? []) as QcBahanRow[];
  const q = filterState.value.search.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    [
      r.Nomor,
      r.Nomor_PO,
      r.JenisKain,
      r.VendorGreige,
      r.VendorCelup,
      r.Keterangan,
    ]
      .map((v) => String(v ?? "").toLowerCase())
      .some((v) => v.includes(q)),
  );
});

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

// Data yang sedang tertampil (setelah search/filter kolom BaseBrowse)
const getExportSource = (): QcBahanRow[] =>
  (baseBrowseRef.value?.getFilteredItems() ??
    items.value ??
    []) as QcBahanRow[];

// "YYYY-MM-DD" -> Date UTC-midnight, supaya Excel tidak geser tanggal
const toExcelDate = (val: string | null): Date | "" => {
  if (!val) return "";
  const [y, m, d] = val.split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Date(Date.UTC(y, m - 1, d));
};

const periodeJudul = () =>
  `${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`;

const onExportHeader = async () => {
  const source = getExportSource();
  if (!source.length) return toast.warning("Tidak ada data untuk diekspor.");

  const columns: ExcelColumn[] = [
    { header: "Nomor", key: "Nomor", width: 20 },
    {
      header: "Tgl Datang",
      key: "TglDatang",
      width: 12,
      align: "center",
      numFmt: "dd mmm yy",
    },
    { header: "Status", key: "Status", width: 12, align: "center" },
    { header: "Nomor PO", key: "Nomor_PO", width: 18 },
    { header: "Jenis Kain", key: "JenisKain", width: 36 },
    { header: "Vendor Greige", key: "VendorGreige", width: 24 },
    { header: "Vendor Celup", key: "VendorCelup", width: 24 },
    { header: "Lot", key: "JumlahLot", width: 8, align: "right" },
    {
      header: "Total Qty",
      key: "TotalKg",
      width: 12,
      align: "right",
      numFmt: "#,##0.00",
    },
    { header: "Satuan", key: "Satuan", width: 8, align: "center" },
    {
      header: "Total Roll",
      key: "TotalRoll",
      width: 10,
      align: "right",
      numFmt: "#,##0",
    },
    { header: "Nilai per Lot", key: "LotNilai", width: 48 },
    { header: "Keterangan", key: "Keterangan", width: 30 },
    { header: "User", key: "Usr", width: 14 },
  ];

  const rows = source.map((r) => ({
    ...r,
    TglDatang: toExcelDate(r.TglDatang),
    JumlahLot: Number(r.JumlahLot) || 0,
    TotalKg: Number(r.TotalKg) || 0,
    TotalRoll: Number(r.TotalRoll) || 0,
    LotNilai: (r.Lots ?? [])
      .map(
        (l) =>
          `${l.Lot}: ${l.Nilai || "-"}${l.Keputusan ? ` (${l.Keputusan})` : ""}`,
      )
      .join("; "),
  }));

  try {
    await exportExcelSingle(
      `QC_Bahan_${filterState.value.dtAwal}_sd_${filterState.value.dtAkhir}.xlsx`,
      "QC Bahan",
      columns,
      rows,
      `QC Bahan Periode ${periodeJudul()}`,
    );
  } catch (e) {
    console.error(e);
    toast.error("Gagal export Excel.");
  }
};

// --- Export Detail (satu baris per lot) ---
interface QcBahanExportDetailRow {
  Nomor: string;
  TglDatang: string;
  Status: string;
  Nomor_PO: string;
  JenisKain: string;
  VendorGreige: string;
  VendorCelup: string;
  Lot: string;
  Kg: number;
  Satuan: string;
  Roll: number;
  RollCek: number;
  GramasiPO: string;
  SettingPO: string;
  Warna: string;
  GramasiCek: number;
  SettingCek: string;
  Nilai: number;
  Keputusan: string;
  LotNourut: number;
  RollNourut: number | null;
  NoRoll: string | null;
  RollQty: number | null;
  GramasiAtas: number | null;
  GramasiBawah: number | null;
  SettingRoll: number | null;
  WarnaMeter: string | null;
  Handfeel: string | null;
  Bowing: string | null;
  Shrinkage: string | null;
  Kelunturan: string | null;
  NilaiRoll: number | null;
  CatatanRoll: string | null;
}

const isExportingDetail = ref(false);

const onExportDetail = async () => {
  isExportingDetail.value = true;
  try {
    const res = await qcBahanService.getAllDetail({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      status: filterState.value.status,
    });
    let allDetail: QcBahanExportDetailRow[] = res.data.data || [];

    // Batasi ke dokumen yang sedang tertampil (search/filter kolom BaseBrowse)
    const visible = new Set(getExportSource().map((r) => r.Nomor));
    allDetail = allDetail.filter((r) => visible.has(r.Nomor));

    if (!allDetail.length) {
      toast.warning("Tidak ada data detail pada filter ini.");
      return;
    }

    // Satu baris per roll. Data header hanya di baris pertama dokumen, metrik lot
    // hanya di baris pertama lot (agar SUM di Excel tidak dobel). Lot No. diulang
    // di setiap baris supaya mudah difilter.
    let prevNomor = "";
    let prevLot = "";
    const rows = allDetail.map((r) => {
      const firstDoc = r.Nomor !== prevNomor;
      const lotKey = `${r.Nomor}|${r.LotNourut}`;
      const firstLot = lotKey !== prevLot;
      prevNomor = r.Nomor;
      prevLot = lotKey;
      return {
        Nomor: firstDoc ? r.Nomor : "",
        TglDatang: firstDoc ? toExcelDate(r.TglDatang) : "",
        Status: firstDoc ? r.Status : "",
        Nomor_PO: firstDoc ? r.Nomor_PO : "",
        JenisKain: firstDoc ? r.JenisKain : "",
        VendorGreige: firstDoc ? r.VendorGreige : "",
        VendorCelup: firstDoc ? r.VendorCelup : "",
        Lot: r.Lot,
        Kg: firstLot ? Number(r.Kg) || 0 : "",
        Satuan: firstLot ? r.Satuan : "",
        Roll: firstLot ? Number(r.Roll) || 0 : "",
        RollCek: firstLot ? Number(r.RollCek) || 0 : "",
        GramasiPO: firstLot ? r.GramasiPO || "" : "",
        SettingPO: firstLot ? r.SettingPO || "" : "",
        Warna: firstLot ? r.Warna || "" : "",
        GramasiCek: firstLot ? Number(r.GramasiCek) || "" : "",
        SettingCek: firstLot ? r.SettingCek || "" : "",
        Nilai: firstLot ? Number(r.Nilai) || "" : "",
        Keputusan: firstLot ? r.Keputusan || "" : "",
        NoRoll: r.RollNourut ? r.NoRoll || r.RollNourut : "",
        RollQty: Number(r.RollQty) || "",
        GramasiAtas: Number(r.GramasiAtas) || "",
        GramasiBawah: Number(r.GramasiBawah) || "",
        SettingRoll: Number(r.SettingRoll) || "",
        WarnaMeter: r.WarnaMeter || "",
        Handfeel: r.Handfeel || "",
        Bowing: r.Bowing || "",
        Shrinkage: r.Shrinkage || "",
        Kelunturan: r.Kelunturan || "",
        NilaiRoll: Number(r.NilaiRoll) || "",
        CatatanRoll: r.CatatanRoll || "",
      };
    });

    const columns: ExcelColumn[] = [
      { header: "Nomor", key: "Nomor", width: 20 },
      {
        header: "Tgl Datang",
        key: "TglDatang",
        width: 12,
        align: "center",
        numFmt: "dd mmm yy",
      },
      { header: "Status", key: "Status", width: 12, align: "center" },
      { header: "Nomor PO", key: "Nomor_PO", width: 18 },
      { header: "Jenis Kain", key: "JenisKain", width: 34 },
      { header: "Vendor Greige", key: "VendorGreige", width: 24 },
      { header: "Vendor Celup", key: "VendorCelup", width: 24 },
      { header: "Lot No.", key: "Lot", width: 18 },
      {
        header: "Qty Lot",
        key: "Kg",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      { header: "Sat", key: "Satuan", width: 7, align: "center" },
      {
        header: "Roll Lot",
        key: "Roll",
        width: 9,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Roll Dicek",
        key: "RollCek",
        width: 10,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Gramasi PO", key: "GramasiPO", width: 14, align: "center" },
      { header: "Setting PO", key: "SettingPO", width: 12, align: "center" },
      { header: "Warna PO", key: "Warna", width: 22 },
      {
        header: "Gramasi Cek (Rata2)",
        key: "GramasiCek",
        width: 14,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Setting Cek (Rata2)",
        key: "SettingCek",
        width: 14,
        align: "center",
      },
      { header: "Nilai Lot", key: "Nilai", width: 9, align: "center" },
      { header: "Keputusan", key: "Keputusan", width: 12, align: "center" },
      { header: "Roll Ke", key: "NoRoll", width: 8, align: "center" },
      {
        header: "Qty Roll",
        key: "RollQty",
        width: 10,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Gramasi Atas",
        key: "GramasiAtas",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Gramasi Bawah",
        key: "GramasiBawah",
        width: 12,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Setting Roll",
        key: "SettingRoll",
        width: 11,
        align: "right",
        numFmt: "#,##0.00",
      },
      {
        header: "Warna (Color Meter)",
        key: "WarnaMeter",
        width: 14,
        align: "center",
      },
      { header: "Handfeel", key: "Handfeel", width: 10, align: "center" },
      { header: "Bowing", key: "Bowing", width: 10, align: "center" },
      { header: "Shrinkage", key: "Shrinkage", width: 10, align: "center" },
      { header: "Kelunturan", key: "Kelunturan", width: 10, align: "center" },
      { header: "Nilai Roll", key: "NilaiRoll", width: 9, align: "center" },
      { header: "Catatan Roll", key: "CatatanRoll", width: 30 },
    ];

    await exportExcelSingle(
      `Detail_QC_Bahan_${filterState.value.dtAwal}_sd_${filterState.value.dtAkhir}.xlsx`,
      "Detail QC Bahan",
      columns,
      rows,
      `Rincian Lot dan Roll QC Bahan | Periode: ${periodeJudul()}`,
    );
    toast.success("Berhasil export detail data.");
  } catch (e) {
    console.error(e);
    toast.error("Gagal export Excel.");
  } finally {
    isExportingDetail.value = false;
  }
};

// --- HEADERS ---
const headers = [
  { title: "Nomor", key: "Nomor", width: "150px", fixed: true },
  { title: "Tgl Datang", key: "TglDatang", width: "100px", align: "center" },
  { title: "Status", key: "Status", width: "110px", align: "center" },
  { title: "Nilai per Lot", key: "Lots", width: "280px", sortable: false },
  { title: "Nomor PO", key: "Nomor_PO", width: "140px" },
  { title: "Jenis Kain", key: "JenisKain", width: "260px" },
  { title: "Vendor Greige", key: "VendorGreige", width: "170px" },
  { title: "Vendor Celup", key: "VendorCelup", width: "170px" },
  { title: "Lot", key: "JumlahLot", width: "60px", align: "right" },
  { title: "Total Qty", key: "TotalKg", width: "110px", align: "right" },
  { title: "Total Roll", key: "TotalRoll", width: "80px", align: "right" },
  { title: "Keterangan", key: "Keterangan", width: "200px" },
  { title: "User", key: "Usr", width: "100px" },
  { title: "Dibuat", key: "Created", width: "140px", align: "center" },
];

// --- EXPAND LOGIC (DETAIL LOT) ---
const expandedRows = ref<QcBahanRow[]>([]);
const detailCache = ref<Record<string, QcBahanDetailRow[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: QcBahanRow[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !detailCache.value[item.Nomor] && !expandedLoading.value[item.Nomor],
  );

  for (const item of newlyExpanded) {
    const nomor = item.Nomor;
    expandedLoading.value[nomor] = true;
    try {
      const res = await qcBahanService.getDetail(nomor);
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail QC ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// --- STYLING ---
const STATUS_ROW_COLOR: Record<string, string> = {
  DRAFT: "#757575",
  MENUNGGU: "#e65100",
  LANJUT: "#2e7d32",
  REJECT: "#c62828",
  SEBAGIAN: "#f9a825",
  TUNDA: "#6a1b9a",
};

const rowPropsFn = (data: { item?: { raw?: QcBahanRow } & QcBahanRow }) => {
  const item = data.item?.raw || data.item;
  const classes: string[] = ["font-weight-bold"];
  let style = "";
  if (item) {
    const color = STATUS_ROW_COLOR[item.Status];
    if (color) style = `color: ${color} !important;`;
  }
  return { class: classes.join(" "), style };
};

const getNomorStyle = (ngedit: string) => {
  if (ngedit === "WAIT") return "background-color: #1976d2; color: white;";
  if (ngedit === "TOLAK") return "background-color: #d32f2f; color: white;";
  if (ngedit === "ACC") return "background-color: #388e3c; color: white;";
  return "";
};

const statusClass = (status: string) => {
  switch (status) {
    case "DRAFT":
      return "chip-draft";
    case "MENUNGGU":
      return "chip-wait";
    case "LANJUT":
      return "chip-ok";
    case "REJECT":
      return "chip-reject";
    case "SEBAGIAN":
      return "chip-partial";
    case "TUNDA":
      return "chip-hold";
    default:
      return "chip-draft";
  }
};

const nilaiClass = (nilai: number) => {
  if (nilai === 3) return "chip-ok";
  if (nilai === 2) return "chip-partial";
  if (nilai === 1) return "chip-reject";
  return "chip-draft";
};

// --- HANDLERS ---
onMounted(() => fetchData());

watch(() => filterState.value.dtAwal, fetchData);
watch(() => filterState.value.dtAkhir, fetchData);
watch(() => filterState.value.status, fetchData);

const onAdd = () => {
  router.push("/garmen/bahan-baku/qc-bahan/form");
};

const onEdit = (item: QcBahanRow) => {
  if (!item || !item.Nomor) return;

  // Dokumen yang sudah disubmit hanya bisa diubah setelah pengajuan di-ACC
  if (item.Status !== "DRAFT" && item.Ngedit !== "ACC") {
    return toast.warning(
      "Dokumen sudah disubmit. Ajukan perubahan data dan tunggu ACC terlebih dahulu.",
    );
  }

  router.push(
    `/garmen/bahan-baku/qc-bahan/form/${encodeURIComponent(item.Nomor)}`,
  );
};

const onDelete = async (item: QcBahanRow) => {
  if (item.Status !== "DRAFT") {
    return toast.warning("Hanya dokumen berstatus DRAFT yang bisa dihapus.");
  }
  try {
    await qcBahanService.delete(item.Nomor);
    toast.success("QC Bahan berhasil dihapus.");
    fetchData();
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal menghapus QC Bahan.");
  }
};

// --- PENGAJUAN PIN ---
const openPinDialog = () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const row = selectedItem.value as QcBahanRow;
  if (row.Status === "DRAFT") {
    return toast.info(
      "Tidak perlu pengajuan perubahan data. Dokumen masih DRAFT.",
    );
  }
  if (row.Ngedit === "ACC") {
    return toast.info("Pengajuan sudah di-ACC. Silakan ubah dokumen.");
  }
  alasanPin.value = "";
  pinDialog.value = true;
};

const submitPin = async () => {
  if (!alasanPin.value.trim()) {
    return toast.error("Alasan pengajuan wajib diisi.");
  }
  try {
    await qcBahanService.requestPin({
      nomor: (selectedItem.value as QcBahanRow).Nomor,
      alasan: alasanPin.value,
    });
    toast.success("Pengajuan perubahan data berhasil dikirim.");
    pinDialog.value = false;
    fetchData();
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal mengirim pengajuan.");
  }
};

// --- SUBMIT DOKUMEN ---
interface SubmitLot {
  Lot: string;
  Kg: number;
  Roll: number;
  Nilai: number;
  lanjut: boolean;
  alasan: string;
}

const submitDialog = ref(false);
const isSubmitting = ref(false);
const submitLoading = ref(false);
const submitLots = ref<SubmitLot[]>([]);

const openSubmitDialog = async () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const row = selectedItem.value as QcBahanRow;
  if (row.Status !== "DRAFT") {
    return toast.info("Hanya dokumen berstatus DRAFT yang dapat disubmit.");
  }
  submitDialog.value = true;
  submitLoading.value = true;
  submitLots.value = [];
  try {
    const res = await qcBahanService.getDetail(row.Nomor);
    submitLots.value = res.data.data.map((d: QcBahanDetailRow) => ({
      Lot: d.Lot,
      Kg: d.Kg,
      Roll: d.Roll,
      Nilai: Number(d.Nilai) || 0,
      lanjut: false,
      alasan: "",
    }));
  } catch {
    toast.error("Gagal memuat data lot.");
    submitDialog.value = false;
  } finally {
    submitLoading.value = false;
  }
};

const keputusanSetelahSubmit = (l: SubmitLot): string => {
  if (l.Nilai === 3) return "LANJUT otomatis";
  if (l.Nilai === 2 && l.lanjut) return "LANJUT (Gudang)";
  return "Menunggu Pembelian";
};

const confirmSubmit = async () => {
  const lanjut: QcLanjutGudang[] = submitLots.value
    .filter((l) => l.Nilai === 2 && l.lanjut)
    .map((l) => ({ lot: l.Lot, alasan: l.alasan.trim() }));
  const tanpaAlasan = lanjut.find((x) => !x.alasan);
  if (tanpaAlasan) {
    return toast.warning(
      `Alasan melanjutkan lot ${tanpaAlasan.lot} wajib diisi.`,
    );
  }

  isSubmitting.value = true;
  try {
    await qcBahanService.submit(
      (selectedItem.value as QcBahanRow).Nomor,
      lanjut,
    );
    toast.success("Dokumen berhasil disubmit.");
    submitDialog.value = false;
    detailCache.value = {};
    fetchData();
  } catch (e) {
    const err = e as { response?: { data?: { message?: string } } };
    toast.error(err.response?.data?.message || "Gagal submit dokumen.");
  } finally {
    isSubmitting.value = false;
  }
};

const onPrint = () => {
  if (selected.value.length === 0) {
    return toast.warning("Pilih data terlebih dahulu.");
  }
  const nomor = (selectedItem.value as QcBahanRow).Nomor;
  window.open(
    `/garmen/bahan-baku/qc-bahan/print/${encodeURIComponent(nomor)}`,
    "_blank",
  );
};

const numFmt = (v: number | string | null) =>
  v ? Number(v).toLocaleString("id-ID") : "0";

const angka = (v: number | string | null) => {
  const n = Number(v);
  return n ? n.toLocaleString("id-ID") : "-";
};

const okNoClass = (v: string) => {
  const s = String(v ?? "").toUpperCase();
  if (s === "OK") return "chip-ok";
  if (s === "NO") return "chip-reject";
  return "chip-draft";
};

const diLuarSpec = (h: string) => /RENDAH|TINGGI/i.test(String(h ?? ""));
</script>

<template>
  <BaseBrowse
    ref="baseBrowseRef"
    title="QC Bahan"
    menu-id="186"
    :icon="IconClipboardCheck"
    :headers="headers"
    :items="filteredItems"
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
    @refresh="fetchData"
    @export="onExportHeader"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tgl Datang</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <span class="f-label">Status</span>
        <select v-model="filterState.status" class="f-date font-weight-bold">
          <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">
            {{ s === "ALL" ? "SEMUA STATUS" : s }}
          </option>
        </select>
      </div>

      <div class="f-divider" />

      <div class="legend-container">
        <span class="f-label text-grey">Nomor:</span>
        <div class="legend-item">
          <span class="l-box bg-blue-darken-2"></span> Nunggu ACC
        </div>
        <div class="legend-item">
          <span class="l-box bg-green-darken-2"></span> Sudah ACC
        </div>
        <div class="legend-item">
          <span class="l-box bg-red-darken-3"></span> Tolak
        </div>
        <span class="f-label text-grey ml-2">Font:</span>
        <div class="legend-item">
          <div class="l-box" style="background: #757575"></div>
          Draft
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #e65100"></div>
          Menunggu
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #2e7d32"></div>
          Lanjut
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #c62828"></div>
          Reject
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #f9a825"></div>
          Sebagian
        </div>
        <div class="legend-item">
          <div class="l-box" style="background: #6a1b9a"></div>
          Tunda
        </div>
      </div>

      <div class="f-divider" />

      <div class="f-group">
        <div class="search-box">
          <IconSearch :size="14" class="text-grey" />
          <input
            type="text"
            v-model="filterState.search"
            placeholder="Cari nomor, PO, kain, vendor..."
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

    <template #item.TglDatang="{ item }">
      {{ formatTanggal(item.TglDatang) }}
    </template>

    <template #item.Status="{ item }">
      <span class="status-chip" :class="statusClass(item.Status)">
        {{ item.Status }}
      </span>
    </template>

    <template #item.Lots="{ item }">
      <div class="lot-chips">
        <span
          v-for="l in item.Lots"
          :key="l.Lot"
          class="status-chip"
          :class="nilaiClass(l.Nilai)"
        >
          {{ l.Lot }}: {{ l.Nilai || "-"
          }}<template v-if="l.Keputusan"> · {{ l.Keputusan }}</template>
        </span>
      </div>
    </template>

    <template #item.TotalKg="{ item }">
      {{ numFmt(item.TotalKg) }} {{ item.Satuan }}
    </template>
    <template #item.TotalRoll="{ item }">{{ numFmt(item.TotalRoll) }}</template>

    <template #item.Created="{ item }">
      {{ formatTanggalJam(item.Created) }}
    </template>

    <!-- Detail Expand (Lazy Load) -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.Nomor]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">Detail Lot - {{ item.Nomor }}</div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="140">Lot No.</th>
                <th width="110" class="tr">Qty</th>
                <th width="70" class="tr">Roll</th>
                <th width="80" class="tr">Roll Dicek</th>
                <th width="110" class="text-center">Gramasi PO</th>
                <th width="90" class="text-center">Setting PO</th>
                <th>Warna</th>
                <th width="110" class="tr">Gramasi Cek</th>
                <th width="100" class="text-center">Setting Cek</th>
                <th width="70" class="text-center">Nilai</th>
                <th width="100" class="text-center">Keputusan</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="d in detailCache[item.Nomor]" :key="d.Nourut">
                <tr>
                  <td class="font-weight-bold">{{ d.Lot }}</td>
                  <td class="tr text-blue-darken-2 font-weight-bold">
                    {{ numFmt(d.Kg) }} {{ d.Satuan }}
                  </td>
                  <td class="tr">{{ numFmt(d.Roll) }}</td>
                  <td class="tr">{{ numFmt(d.RollCek) }}</td>
                  <td class="text-center">{{ d.GramasiPO || "-" }}</td>
                  <td class="text-center">{{ d.SettingPO || "-" }}</td>
                  <td>{{ d.Warna || "-" }}</td>
                  <td class="tr">{{ angka(d.GramasiCek) }}</td>
                  <td class="text-center">{{ d.SettingCek || "-" }}</td>
                  <td class="text-center">
                    <span class="status-chip" :class="nilaiClass(d.Nilai)">
                      {{ d.Nilai || "-" }}
                    </span>
                  </td>
                  <td class="text-center">{{ d.Keputusan || "-" }}</td>
                </tr>
                <tr v-if="d.Rolls && d.Rolls.length">
                  <td colspan="11" class="roll-cell">
                    <table class="roll-table">
                      <thead>
                        <tr>
                          <th width="50">Roll</th>
                          <th width="80">Qty</th>
                          <th width="90">Gramasi Atas</th>
                          <th width="90">Gramasi Bawah</th>
                          <th width="80">Setting</th>
                          <th width="70">Warna</th>
                          <th width="80">Handfeel</th>
                          <th width="80">Bowing</th>
                          <th width="80">Shrinkage</th>
                          <th width="80">Kelunturan</th>
                          <th width="60">Nilai</th>
                          <th>Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="r in d.Rolls" :key="r.Nourut">
                          <td>{{ r.NoRoll || r.Nourut }}</td>
                          <td>{{ angka(r.Qty) }}</td>
                          <td :class="{ 'roll-bad': diLuarSpec(r.HGramasi) }">
                            {{ angka(r.GramasiAtas) }}
                          </td>
                          <td :class="{ 'roll-bad': diLuarSpec(r.HGramasi) }">
                            {{ angka(r.GramasiBawah) }}
                          </td>
                          <td :class="{ 'roll-bad': diLuarSpec(r.HSetting) }">
                            {{ angka(r.SettingCek) }}
                          </td>
                          <td>{{ r.Warna || "-" }}</td>
                          <td>
                            <span
                              class="status-chip"
                              :class="okNoClass(r.Handfeel)"
                              >{{ r.Handfeel || "-" }}</span
                            >
                          </td>
                          <td>
                            <span
                              class="status-chip"
                              :class="okNoClass(r.Bowing)"
                              >{{ r.Bowing || "-" }}</span
                            >
                          </td>
                          <td>
                            <span
                              class="status-chip"
                              :class="okNoClass(r.Shrinkage)"
                              >{{ r.Shrinkage || "-" }}</span
                            >
                          </td>
                          <td>
                            <span
                              class="status-chip"
                              :class="okNoClass(r.Kelunturan)"
                              >{{ r.Kelunturan || "-" }}</span
                            >
                          </td>
                          <td>
                            <span
                              class="status-chip"
                              :class="nilaiClass(r.Nilai)"
                              >{{ r.Nilai || "-" }}</span
                            >
                          </td>
                          <td class="tl">{{ r.Catatan || "-" }}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </template>
              <tr
                v-if="
                  !detailCache[item.Nomor] ||
                  detailCache[item.Nomor].length === 0
                "
              >
                <td colspan="11" class="text-center text-grey py-3 font-italic">
                  Detail lot tidak ditemukan.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Additional Actions -->
    <template #extra-actions="{ selected }">
      <v-btn
        size="small"
        color="grey-darken-3"
        class="ml-2"
        :disabled="selected.length === 0"
        @click="onPrint"
      >
        <template #prepend
          ><IconPrinter :size="15" :stroke-width="1.7"
        /></template>
        Cetak
      </v-btn>
      <v-btn
        v-if="canExport"
        size="small"
        color="green-darken-3"
        variant="outlined"
        class="ml-2"
        :loading="isExportingDetail"
        @click="onExportDetail"
      >
        <template #prepend>
          <IconFileSpreadsheet :size="15" :stroke-width="1.7" />
        </template>
        Export Detail
      </v-btn>
      <v-menu v-if="selected.length > 0">
        <template #activator="{ props }">
          <v-btn size="small" color="teal-darken-3" v-bind="props" class="ml-2">
            <template #prepend><IconDotsVertical :size="15" /></template
            >Tindakan
          </v-btn>
        </template>
        <v-list density="compact" class="text-caption">
          <v-list-item @click="openSubmitDialog" :disabled="!canEdit">
            <template #prepend
              ><IconSend :size="14" class="mr-2 text-success"
            /></template>
            <v-list-item-title>Submit Dokumen</v-list-item-title>
          </v-list-item>
          <v-list-item @click="openPinDialog" :disabled="!canEdit">
            <template #prepend
              ><IconShieldLock :size="14" class="mr-2 text-primary"
            /></template>
            <v-list-item-title>Pengajuan Perubahan Data</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>
  </BaseBrowse>

  <!-- Dialog Request PIN -->
  <v-dialog v-model="pinDialog" max-width="400">
    <v-card rounded="lg">
      <v-card-title class="bg-primary text-white pa-3 text-subtitle-1">
        Pengajuan Perubahan Data
      </v-card-title>
      <v-card-text class="pa-4">
        <p class="text-caption mb-2">
          Nomor QC: <b>{{ selectedItem?.Nomor }}</b>
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

  <!-- Dialog Submit -->
  <v-dialog v-model="submitDialog" max-width="760" persistent>
    <v-card rounded="lg">
      <v-card-title class="bg-success text-white pa-3 text-subtitle-1">
        Submit Dokumen {{ selectedItem?.Nomor }}
      </v-card-title>
      <v-card-text class="pa-3 text-body-2">
        <v-progress-linear v-if="submitLoading" indeterminate height="2" />
        <template v-else>
          <div class="mb-2">
            Nilai 3 otomatis LANJUT. Nilai 1 dan 2 menunggu Pembelian, kecuali
            lot nilai 2 yang Anda lanjutkan di sini dengan alasan. Setelah
            disubmit, perubahan data hanya bisa lewat pengajuan perubahan.
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="130">Lot No.</th>
                <th width="90" class="tr">Qty</th>
                <th width="50" class="text-center">Nilai</th>
                <th width="150">Setelah Submit</th>
                <th width="80" class="text-center">Lanjutkan</th>
                <th>Alasan</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="l in submitLots" :key="l.Lot">
                <td class="font-weight-bold">{{ l.Lot }}</td>
                <td class="tr">{{ l.Kg }}</td>
                <td class="text-center">{{ l.Nilai || "-" }}</td>
                <td>{{ keputusanSetelahSubmit(l) }}</td>
                <td class="text-center">
                  <input
                    v-if="l.Nilai === 2"
                    v-model="l.lanjut"
                    type="checkbox"
                  />
                </td>
                <td>
                  <input
                    v-if="l.Nilai === 2"
                    v-model="l.alasan"
                    type="text"
                    class="f-date"
                    style="width: 100%"
                    :disabled="!l.lanjut"
                    :placeholder="l.lanjut ? 'Wajib diisi' : ''"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </v-card-text>
      <v-card-actions class="pa-3 border-t">
        <v-spacer />
        <v-btn variant="text" @click="submitDialog = false">Batal</v-btn>
        <v-btn
          color="success"
          variant="elevated"
          :loading="isSubmitting"
          :disabled="submitLoading"
          @click="confirmSubmit"
          >Submit</v-btn
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
  width: 240px;
}
.f-search-inp {
  border: none;
  outline: none;
  font-size: 11px;
  padding-left: 6px;
  width: 100%;
}

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

.status-chip {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 9.5px;
  font-weight: 700;
  white-space: nowrap;
}
.chip-draft {
  background: #f5f5f5;
  color: #757575;
}
.chip-wait {
  background: #fff3e0;
  color: #e65100;
}
.chip-ok {
  background: #e8f5e9;
  color: #2e7d32;
}
.chip-reject {
  background: #ffebee;
  color: #c62828;
}
.chip-partial {
  background: #fffde7;
  color: #f57f17;
}
.chip-hold {
  background: #f3e5f5;
  color: #6a1b9a;
}
.lot-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 0;
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
.roll-cell {
  padding: 4px 8px 10px 28px !important;
  background: #f5f7f8;
}
.roll-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-size: 10.5px;
}
.roll-table th {
  background: #78909c;
  color: white;
  padding: 3px 6px;
  text-align: center;
  font-weight: bold;
}
.roll-table td {
  padding: 3px 6px;
  border-bottom: 1px solid #eee;
  text-align: center;
}
.roll-table .tl {
  text-align: left;
}
.roll-bad {
  color: #c62828;
  font-weight: 700;
}
</style>
