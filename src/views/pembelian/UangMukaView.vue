<script setup lang="ts">
import { ref, onMounted, onActivated, computed, watch } from "vue";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "vue-router";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { uangMukaService } from "@/services/pembelian/uangMukaService";
import { pengajuanUangMukaService } from "@/services/pembelian/pengajuanUangMukaService";
import { uangMukaPenyelesaianFormService } from "@/services/pembelian/uangMukaPenyelesaianFormService";
import { exportExcelSingle } from "@/utils/excelExport";
import {
  IconCash,
  IconSend,
  IconPrinter,
  IconCheck,
  IconFileExport,
  IconListDetails,
} from "@tabler/icons-vue";
import NumberInputIDR from "@/components/NumberInputIDR.vue";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();

const userBagian = computed(() => (authStore.user?.bagian || "").toUpperCase());
const isAdmin = computed(
  () => (authStore.user?.kode || "").toUpperCase() === "ADMIN",
);

const activeTab = ref<"outstanding" | "pum-outstanding" | "history">(
  "outstanding",
);

const canSeeOutstandingSumber = computed(
  () =>
    isAdmin.value || ["PEMBELIAN", "EDP", "AUDIT"].includes(userBagian.value),
);
const canRealisasi = computed(
  () => isAdmin.value || ["FINANCE", "EDP", "AUDIT"].includes(userBagian.value),
);

const today = new Date();
const padDate = (n: number) => String(n).padStart(2, "0");
const toLocalDate = (d: Date) =>
  `${d.getFullYear()}-${padDate(d.getMonth() + 1)}-${padDate(d.getDate())}`;
const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayStr = toLocalDate(today);

const filters = ref({
  dtAwal: firstDayOfMonth,
  dtAkhir: todayStr,
  cabFilter: "ALL",
});

const CABANG_LIST = ["ALL", "P01", "P02", "P04", "P05"];

const outstandingItems = ref<any[]>([]);
const isLoading = ref(false);
const selectedOutstanding = ref<any[]>([]);
const pumOutstandingItems = ref<any[]>([]);
const pumHistoryItems = ref<any[]>([]);
const selectedPumOutstanding = ref<any[]>([]);
const selectedPumHistory = ref<any[]>([]);

const baseBrowseRef = ref<InstanceType<typeof BaseBrowse> | null>(null);

const isExportingOutstanding = ref(false);
const isExportingOutstandingDetail = ref(false);
const isExportingPum = ref(false);
const isExportingPumDetail = ref(false);
const isExportingHistory = ref(false);
const isExportingHistoryDetail = ref(false);

const fetchOutstanding = async () => {
  isLoading.value = true;
  try {
    const res = await uangMukaService.getOutstanding({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
    });
    outstandingItems.value = res.data.items.map((r: any) => ({
      ...r,
      RowKey: `${r.Sumber}-${r.Nomor}`,
    }));
    selectedOutstanding.value = [];
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat data outstanding.");
  } finally {
    isLoading.value = false;
  }
};

const onExportOutstanding = async () => {
  const data =
    baseBrowseRef.value?.getFilteredItems?.() ?? outstandingItems.value ?? [];
  if (!data.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingOutstanding.value = true;
  try {
    const rows = data.map((r: any) => ({
      Sumber: sumberLabel(r.Sumber),
      Nomor: r.Nomor,
      Tanggal: tglFmt(r.Tanggal),
      Keterangan: r.Keterangan,
      Pemohon: r.Pemohon,
      Bagian: r.Bagian,
      Cabang: r.Cabang,
      Nominal: Math.round(Number(r.Nominal) || 0),
    }));
    await exportExcelSingle(
      `UangMuka_Outstanding_${filters.value.dtAwal}_${filters.value.dtAkhir}`,
      "Outstanding",
      [
        { header: "Sumber", key: "Sumber" },
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "Pemohon", key: "Pemohon" },
        { header: "Bagian", key: "Bagian" },
        { header: "Cabang", key: "Cabang" },
        { header: "Nominal", key: "Nominal", align: "right", numFmt: "#,##0" },
      ],
      rows,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExportingOutstanding.value = false;
  }
};

const onExportOutstandingDetail = async () => {
  const masters =
    baseBrowseRef.value?.getFilteredItems?.() ?? outstandingItems.value ?? [];
  if (!masters.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingOutstandingDetail.value = true;
  try {
    const results = await Promise.all(
      masters.map((h: any) =>
        uangMukaService
          .getOutstandingDetail(h.Sumber, h.Nomor)
          .then((res) => ({ header: h, items: res.data ?? [] }))
          .catch(() => ({ header: h, items: [] })),
      ),
    );

    const combinedRows: any[] = [];
    results.forEach(({ header, items: dtl }) => {
      const masterCells = {
        Sumber: sumberLabel(header.Sumber),
        Nomor: header.Nomor,
        Tanggal: tglFmt(header.Tanggal),
        Keterangan: header.Keterangan,
        Pemohon: header.Pemohon,
        Bagian: header.Bagian,
        Cabang: header.Cabang,
        Nominal: Math.round(Number(header.Nominal) || 0),
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (!dtl.length) {
        combinedRows.push({
          ...masterCells,
          ItemNama: "",
          ItemKode: "",
          ItemSatuan: "",
          ItemQty: "",
          ItemNominal: "",
          ItemQtyRealisasi: "",
          ItemNominalRealisasi: "",
          ItemKeterangan: "",
        });
        return;
      }

      dtl.forEach((d: any, idx: number) => {
        const isDana = header.Sumber === "PENGAJUAN_DANA";
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          ItemNama: d.Nama,
          ItemKode: isDana ? "" : d.Kode,
          ItemSatuan: d.Satuan,
          ItemQty: isDana ? Number(d.QtyPengajuan) || 0 : Number(d.Qty) || 0,
          ItemNominal: Math.round(
            Number(isDana ? d.RpPengajuan : d.Nominal) || 0,
          ),
          ItemQtyRealisasi: Number(d.QtyRealisasi) || 0,
          ItemNominalRealisasi: Math.round(
            Number(isDana ? d.RpApproved : d.NominalRealisasi) || 0,
          ),
          ItemKeterangan: isDana ? d.Keterangan : "",
        });
      });
    });

    await exportExcelSingle(
      `UangMuka_Outstanding_Detail_${filters.value.dtAwal}_${filters.value.dtAkhir}`,
      "Detail",
      [
        { header: "Sumber", key: "Sumber" },
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "Pemohon", key: "Pemohon" },
        { header: "Bagian", key: "Bagian" },
        { header: "Cabang", key: "Cabang" },
        { header: "Nominal", key: "Nominal", align: "right", numFmt: "#,##0" },
        { header: "Item", key: "ItemNama" },
        { header: "Kode", key: "ItemKode" },
        { header: "Satuan", key: "ItemSatuan" },
        { header: "Qty", key: "ItemQty", align: "right" },
        {
          header: "Nominal Item",
          key: "ItemNominal",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Qty Realisasi", key: "ItemQtyRealisasi", align: "right" },
        {
          header: "Nominal Realisasi",
          key: "ItemNominalRealisasi",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Keterangan Item", key: "ItemKeterangan" },
      ],
      combinedRows,
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingOutstandingDetail.value = false;
  }
};

const fetchPumOutstanding = async () => {
  isLoading.value = true;
  try {
    const res = await pengajuanUangMukaService.getBrowse({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
      cabang:
        filters.value.cabFilter === "ALL" ? undefined : filters.value.cabFilter,
      status: "OUTSTANDING",
    });
    pumOutstandingItems.value = res.data.map((r: any) => ({
      ...r,
      RowKey: r.Nomor,
    }));
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal memuat Pengajuan Uang Muka.",
    );
  } finally {
    isLoading.value = false;
  }
};

const onExportPum = async () => {
  const data =
    baseBrowseRef.value?.getFilteredItems?.() ??
    pumOutstandingItems.value ??
    [];
  if (!data.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingPum.value = true;
  try {
    const rows = data.map((r: any) => ({
      Nomor: r.Nomor,
      Tanggal: tglFmt(r.Tanggal),
      Status: STATUS_LABEL[r.Status]?.label || r.Status,
      Keterangan: r.Keterangan,
      Cabang: r.Cabang,
      TotalNominal: Math.round(Number(r.TotalNominal) || 0),
      BonNomor: r.BonNomor || "-",
      UserCreate: r.UserCreate,
    }));
    await exportExcelSingle(
      `PUM_Outstanding_${filters.value.dtAwal}_${filters.value.dtAkhir}`,
      "PUM Outstanding",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Status", key: "Status" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "Cabang", key: "Cabang" },
        {
          header: "Total Nominal",
          key: "TotalNominal",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "No. Bon", key: "BonNomor" },
        { header: "User", key: "UserCreate" },
      ],
      rows,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExportingPum.value = false;
  }
};

const onExportPumDetail = async () => {
  const masters =
    baseBrowseRef.value?.getFilteredItems?.() ??
    pumOutstandingItems.value ??
    [];
  if (!masters.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingPumDetail.value = true;
  try {
    const results = await Promise.all(
      masters.map((h: any) =>
        pengajuanUangMukaService
          .getDetail(h.Nomor)
          .then((res) => ({ header: h, items: res.data ?? [] }))
          .catch(() => ({ header: h, items: [] })),
      ),
    );

    const combinedRows: any[] = [];
    results.forEach(({ header, items: dtl }) => {
      const masterCells = {
        Nomor: header.Nomor,
        Tanggal: tglFmt(header.Tanggal),
        Status: STATUS_LABEL[header.Status]?.label || header.Status,
        Keterangan: header.Keterangan,
        Cabang: header.Cabang,
        TotalNominal: Math.round(Number(header.TotalNominal) || 0),
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      dtl.forEach((d: any, idx: number) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          ItemSumber: d.Sumber === "KASBON" ? "KASBON" : sumberLabel(d.Sumber),
          ItemNomorSumber: d.NomorSumber,
          ItemNama: d.Nama,
          ItemSatuan: d.Satuan,
          ItemQty: d.Qty != null ? Number(d.Qty) || 0 : "",
          ItemKeterangan: d.Keterangan,
          ItemNominalSumber: Math.round(Number(d.NominalSumber) || 0),
          ItemNominalAjuan: Math.round(Number(d.NominalAjuan) || 0),
          ItemStatusAcc: d.StatusAcc || "-",
          ItemNominalAcc:
            d.NominalAcc != null ? Math.round(Number(d.NominalAcc)) : "",
        });
      });
    });

    await exportExcelSingle(
      `PUM_Outstanding_Detail_${filters.value.dtAwal}_${filters.value.dtAkhir}`,
      "Detail",
      [
        { header: "Nomor PUM", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Status", key: "Status" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "Cabang", key: "Cabang" },
        {
          header: "Total Nominal",
          key: "TotalNominal",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Sumber", key: "ItemSumber" },
        { header: "Nomor Sumber", key: "ItemNomorSumber" },
        { header: "Item", key: "ItemNama" },
        { header: "Satuan", key: "ItemSatuan" },
        { header: "Qty", key: "ItemQty", align: "right" },
        { header: "Keterangan Item", key: "ItemKeterangan" },
        {
          header: "Nominal Sumber",
          key: "ItemNominalSumber",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Nominal Ajuan",
          key: "ItemNominalAjuan",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Status ACC", key: "ItemStatusAcc" },
        {
          header: "Nominal ACC",
          key: "ItemNominalAcc",
          align: "right",
          numFmt: "#,##0",
        },
      ],
      combinedRows,
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingPumDetail.value = false;
  }
};

const fetchPumHistory = async () => {
  isLoading.value = true;
  try {
    const res = await pengajuanUangMukaService.getBrowse({
      startDate: filters.value.dtAwal,
      endDate: filters.value.dtAkhir,
      cabang:
        filters.value.cabFilter === "ALL" ? undefined : filters.value.cabFilter,
      status: "HISTORY",
    });
    pumHistoryItems.value = res.data.map((r: any) => ({
      ...r,
      RowKey: r.Nomor || `LEGACY-${r.BonNomor}`,
    }));
  } catch (e: any) {
    toast.error(
      e.response?.data?.message || "Gagal memuat riwayat Pengajuan Uang Muka.",
    );
  } finally {
    isLoading.value = false;
  }
};

const onExportHistory = async () => {
  const data =
    baseBrowseRef.value?.getFilteredItems?.() ?? pumHistoryItems.value ?? [];
  if (!data.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingHistory.value = true;
  try {
    const rows = data.map((r: any) => ({
      Nomor: r.Nomor || "-",
      Tanggal: tglFmt(r.Tanggal),
      Jenis: r.Jenis || "-",
      Account: r.Account || "-",
      Pjh: r.Pjh || "-",
      Nota: r.Nota || "-",
      Penerima: r.Penerima || "-",
      TotalNominal: Math.round(Number(r.TotalNominal) || 0),
      Terpakai: Math.round(Number(r.Terpakai) || 0),
      Sisa: Math.round(Number(r.Sisa) || 0),
      Keterangan: r.Keterangan,
      NoBukti: r.NoBukti || "-",
      Selesai: selesaiLabel(r.BonSelesai),
      Closed: closedLabel(r.Closed),
      DibuatOleh: r.DibuatOleh || "-",
      TglDibuat: r.TglDibuat || "-",
      Status: STATUS_LABEL[r.Status]?.label || r.Status,
    }));
    await exportExcelSingle(
      `PUM_Realisasi_${filters.value.dtAwal}_${filters.value.dtAkhir}`,
      "Realisasi",
      [
        { header: "Nomor", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Jenis", key: "Jenis" },
        { header: "Account", key: "Account" },
        { header: "PJH", key: "Pjh" },
        { header: "Nota", key: "Nota" },
        { header: "Penerima", key: "Penerima" },
        {
          header: "Total Nominal",
          key: "TotalNominal",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Terpakai",
          key: "Terpakai",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Sisa", key: "Sisa", align: "right", numFmt: "#,##0" },
        { header: "Keterangan", key: "Keterangan" },
        { header: "No Bukti", key: "NoBukti" },
        { header: "Selesai", key: "Selesai" },
        { header: "Closed", key: "Closed" },
        { header: "Dibuat Oleh", key: "DibuatOleh" },
        { header: "Tgl Dibuat", key: "TglDibuat" },
        { header: "Status", key: "Status" },
      ],
      rows,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExportingHistory.value = false;
  }
};

const onExportHistoryDetail = async () => {
  const masters =
    baseBrowseRef.value?.getFilteredItems?.() ?? pumHistoryItems.value ?? [];
  if (!masters.length) {
    toast.warning("Tidak ada data untuk diexport.");
    return;
  }
  isExportingHistoryDetail.value = true;
  try {
    const results = await Promise.all(
      masters.map((h: any) =>
        h.Nomor
          ? pengajuanUangMukaService
              .getDetail(h.Nomor)
              .then((res) => ({ header: h, items: res.data ?? [] }))
              .catch(() => ({ header: h, items: [] }))
          : Promise.resolve({ header: h, items: [] }),
      ),
    );

    const combinedRows: any[] = [];
    results.forEach(({ header, items: dtl }) => {
      const masterCells = {
        Nomor: header.Nomor || "-",
        Tanggal: tglFmt(header.Tanggal),
        Jenis: header.Jenis || "-",
        Account: header.Account || "-",
        BonNomor: header.BonNomor || "-",
        Penerima: header.Penerima || "-",
        TotalNominal: Math.round(Number(header.TotalNominal) || 0),
        Status: STATUS_LABEL[header.Status]?.label || header.Status,
      };
      const blankMaster = Object.fromEntries(
        Object.keys(masterCells).map((k) => [k, ""]),
      );

      if (!dtl.length) {
        combinedRows.push({
          ...masterCells,
          ItemSumber: "",
          ItemNomorSumber: "",
          ItemNama: "",
          ItemNominalSumber: "",
          ItemNominalAjuan: "",
          ItemStatusAcc: "",
          ItemNominalAcc: "",
        });
        return;
      }

      dtl.forEach((d: any, idx: number) => {
        combinedRows.push({
          ...(idx === 0 ? masterCells : blankMaster),
          ItemSumber: d.Sumber === "KASBON" ? "KASBON" : sumberLabel(d.Sumber),
          ItemNomorSumber: d.NomorSumber,
          ItemNama: d.Nama,
          ItemNominalSumber: Math.round(Number(d.NominalSumber) || 0),
          ItemNominalAjuan: Math.round(Number(d.NominalAjuan) || 0),
          ItemStatusAcc: d.StatusAcc || "-",
          ItemNominalAcc:
            d.NominalAcc != null ? Math.round(Number(d.NominalAcc)) : "",
        });
      });
    });

    await exportExcelSingle(
      `PUM_Realisasi_Detail_${filters.value.dtAwal}_${filters.value.dtAkhir}`,
      "Detail",
      [
        { header: "Nomor PUM", key: "Nomor" },
        { header: "Tanggal", key: "Tanggal" },
        { header: "Jenis", key: "Jenis" },
        { header: "Account", key: "Account" },
        { header: "No. Bon", key: "BonNomor" },
        { header: "Penerima", key: "Penerima" },
        {
          header: "Total Nominal",
          key: "TotalNominal",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Status", key: "Status" },
        { header: "Sumber", key: "ItemSumber" },
        { header: "Nomor Sumber", key: "ItemNomorSumber" },
        { header: "Item", key: "ItemNama" },
        {
          header: "Nominal Sumber",
          key: "ItemNominalSumber",
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Nominal Ajuan",
          key: "ItemNominalAjuan",
          align: "right",
          numFmt: "#,##0",
        },
        { header: "Status ACC", key: "ItemStatusAcc" },
        {
          header: "Nominal ACC",
          key: "ItemNominalAcc",
          align: "right",
          numFmt: "#,##0",
        },
      ],
      combinedRows,
    );
  } catch {
    toast.error("Gagal export detail.");
  } finally {
    isExportingHistoryDetail.value = false;
  }
};

const fetchActiveTab = () => {
  if (activeTab.value === "outstanding") fetchOutstanding();
  else if (activeTab.value === "pum-outstanding") fetchPumOutstanding();
  else fetchPumHistory();
};

watch(() => [filters.value.dtAwal, filters.value.dtAkhir], fetchActiveTab);
watch(
  () => filters.value.cabFilter,
  () => {
    if (activeTab.value !== "outstanding") fetchActiveTab();
  },
);
watch(activeTab, () => {
  fetchActiveTab();
});
onMounted(() => {
  if (!canSeeOutstandingSumber.value && userBagian.value === "FINANCE") {
    activeTab.value = "pum-outstanding";
  }
  fetchActiveTab();
});
onActivated(() => {
  fetchActiveTab();
});

// ── Guard: baris Outstanding yang dipilih tidak harus dari Sumber yang sama ──
const canAjukan = computed(() => selectedOutstanding.value.length > 0);

const numFmt = (v: any) =>
  v != null ? Number(v).toLocaleString("id-ID") : "0";
const tglFmt = (v: any) => {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const sumberLabel = (v: string) =>
  v === "PENGAJUAN_DANA" ? "Pengajuan Dana" : "Permintaan Pembelian";

const STATUS_LABEL: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  DIAJUKAN: { label: "Diajukan", color: "#e65100", bg: "#fff3e0" },
  REALISASI: { label: "Realisasi", color: "#2e7d32", bg: "#e8f5e9" },
  DITOLAK: { label: "Ditolak", color: "#c62828", bg: "#ffebee" },
  BATAL: { label: "Batal", color: "#616161", bg: "#f5f5f5" },
};

const statusRealisasiInfo = (qtyAjukan: number, qtyRealisasi: number) => {
  const realisasi = Number(qtyRealisasi) || 0;
  if (realisasi === 0) return null;
  const ajukan = Number(qtyAjukan) || 0;
  if (realisasi === ajukan)
    return { label: "Close", bg: "#e8f5e9", fg: "#2e7d32" };
  if (realisasi < ajukan)
    return { label: "Kurang", bg: "#fff3e0", fg: "#e65100" };
  return { label: "Lebih", bg: "#e3f2fd", fg: "#1565c0" };
};

const selesaiLabel = (v: any) => (Number(v) === 1 ? "Sudah" : "Belum");
const closedLabel = (v: any) => (v ? "Sudah" : "Belum");

// ── Dialog Ajukan ──
const showAjukanDialog = ref(false);
const showAjukanPrintDialog = ref(false);
const savedPumNomor = ref("");
const ajukanTanggal = ref(todayStr);
const ajukanKeterangan = ref("");
const isSubmittingAjukan = ref(false);
const ajukanItems = ref<any[]>([]);
const ajukanNominalDiajukan = ref(0);
const isLoadingAjukanDetail = ref(false);

const openAjukanDialog = async () => {
  if (!canAjukan.value) return;
  ajukanTanggal.value = todayStr;
  ajukanKeterangan.value = "";
  showAjukanDialog.value = true;
  isLoadingAjukanDetail.value = true;
  try {
    const results = await Promise.all(
      selectedOutstanding.value.map((h) =>
        uangMukaService
          .getOutstandingDetail(h.Sumber, h.Nomor)
          .then((res) => ({ header: h, items: res.data })),
      ),
    );
    ajukanItems.value = results.flatMap(({ header, items }) =>
      items.map((it: any) => {
        const nominalSumber =
          header.Sumber === "PENGAJUAN_DANA"
            ? Number(it.RpPengajuan) || 0
            : Number(it.Nominal) || 0;
        const qty =
          header.Sumber === "PENGAJUAN_DANA"
            ? Number(it.QtyPengajuan) || 0
            : Number(it.Qty) || 0;
        return {
          Sumber: header.Sumber,
          NomorHeader: header.Nomor,
          ItemNourut: it.ItemNourut,
          Nama: it.Nama,
          Satuan: it.Satuan,
          Qty: qty,
          Keterangan: header.Keterangan,
          NominalSumber: nominalSumber,
        };
      }),
    );
    // Default nominal diajukan = total nominal sumber, Purchasing bisa ubah manual
    ajukanNominalDiajukan.value = ajukanItems.value.reduce(
      (s, r) => s + Number(r.NominalSumber || 0),
      0,
    );
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal memuat rincian item.");
    showAjukanDialog.value = false;
  } finally {
    isLoadingAjukanDetail.value = false;
  }
};

const ajukanTotalSumber = computed(() =>
  ajukanItems.value.reduce((s, r) => s + Number(r.NominalSumber || 0), 0),
);

const submitAjukan = async () => {
  if (!ajukanNominalDiajukan.value || ajukanNominalDiajukan.value <= 0) {
    toast.warning("Nominal yang diajukan harus diisi.");
    return;
  }
  isSubmittingAjukan.value = true;
  try {
    const items = ajukanItems.value.map((r) => ({
      sumber: r.Sumber,
      nomorHeader: r.NomorHeader,
      itemNourut: r.ItemNourut,
      nama: r.Nama,
      satuan: r.Satuan,
      qty: r.Qty,
      keterangan: r.Keterangan,
      nominalAsli: r.NominalSumber,
    }));
    const res = await pengajuanUangMukaService.create({
      tanggal: ajukanTanggal.value,
      keterangan: ajukanKeterangan.value,
      nominalDiajukan: ajukanNominalDiajukan.value,
      items,
    });
    toast.success(`Pengajuan Uang Muka ${res.data.nomor} berhasil dibuat.`);
    showAjukanDialog.value = false;
    savedPumNomor.value = res.data.nomor;
    showAjukanPrintDialog.value = true;
    await Promise.all([fetchOutstanding(), fetchPumOutstanding()]);
  } catch (e: any) {
    toast.error(e.response?.data?.message || "Gagal membuat pengajuan.");
  } finally {
    isSubmittingAjukan.value = false;
  }
};

const cetakBuktiPengajuan = () => {
  window.open(
    `/pembelian/uang-muka/print-pengajuan/${encodeURIComponent(savedPumNomor.value)}`,
    "_blank",
  );
  showAjukanPrintDialog.value = false;
};
const openPrintPumAjuan = () => {
  const item = selectedPumOutstanding.value[0];
  if (!item) return;
  window.open(
    `/pembelian/uang-muka/print-pengajuan/${encodeURIComponent(item.Nomor)}`,
    "_blank",
  );
};
const outstandingHeaders = [
  { title: "Sumber", key: "Sumber", width: "150px" },
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Pemohon", key: "Pemohon", width: "150px" },
  { title: "Bagian", key: "Bagian", width: "120px" },
  { title: "Cabang", key: "Cabang", width: "90px" },
  { title: "Nominal", key: "Nominal", width: "120px", align: "right" },
];

const pumHeaders = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Status", key: "Status", width: "110px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
  { title: "Cabang", key: "Cabang", width: "90px" },
  {
    title: "Total Nominal",
    key: "TotalNominal",
    width: "130px",
    align: "right",
  },
  { title: "No. Bon", key: "BonNomor", width: "150px" },
  { title: "User", key: "UserCreate", width: "90px" },
];

const historyHeaders = [
  { title: "Nomor", key: "Nomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "100px", align: "center" },
  { title: "Jenis", key: "Jenis", width: "80px" },
  { title: "Account", key: "Account", width: "180px" },
  { title: "PJH", key: "Pjh", width: "130px" },
  { title: "Nota", key: "Nota", width: "90px" },
  { title: "Penerima", key: "Penerima", width: "130px" },
  { title: "Nominal", key: "TotalNominal", width: "120px", align: "right" },
  { title: "Terpakai", key: "Terpakai", width: "120px", align: "right" },
  { title: "Sisa", key: "Sisa", width: "120px", align: "right" },
  { title: "Keterangan", key: "Keterangan", minWidth: "160px" },
  { title: "No Bukti", key: "NoBukti", width: "150px" },
  { title: "Selesai", key: "SelesaiLabel", width: "90px", align: "center" },
  { title: "Closed", key: "ClosedLabel", width: "90px", align: "center" },
  { title: "Dibuat Oleh", key: "DibuatOleh", width: "110px" },
  { title: "Tgl Dibuat", key: "TglDibuat", width: "140px", align: "center" },
];

const expandedOutstanding = ref<any[]>([]);
const outstandingDetailCache = ref<Record<string, any[]>>({});
const outstandingDetailLoading = ref<Record<string, boolean>>({});

const onUpdateExpandedOutstanding = async (newExpanded: any[]) => {
  expandedOutstanding.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !outstandingDetailCache.value[item.RowKey] &&
      !outstandingDetailLoading.value[item.RowKey],
  );
  for (const item of newlyExpanded) {
    const key = item.RowKey;
    outstandingDetailLoading.value[key] = true;
    try {
      const res = await uangMukaService.getOutstandingDetail(
        item.Sumber,
        item.Nomor,
      );
      outstandingDetailCache.value[key] = res.data;
    } catch {
      toast.error(`Gagal memuat detail ${item.Nomor}`);
    } finally {
      outstandingDetailLoading.value[key] = false;
    }
  }
};

// ── Expand detail PUM ──
const expandedPum = ref<any[]>([]);
const pumDetailCache = ref<Record<string, any[]>>({});
const pumDetailLoading = ref<Record<string, boolean>>({});
const penyelesaianDetailCache = ref<Record<string, any>>({});
const penyelesaianDetailLoading = ref<Record<string, boolean>>({});

const onUpdateExpandedPum = async (newExpanded: any[]) => {
  expandedPum.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) =>
      !pumDetailCache.value[item.RowKey] &&
      !pumDetailLoading.value[item.RowKey],
  );
  for (const item of newlyExpanded) {
    const key = item.RowKey;
    if (!item.Nomor) {
      // Kasbon lama — tidak ada Pengajuan Uang Muka, gak perlu fetch.
      pumDetailCache.value[key] = [];
      continue;
    }
    pumDetailLoading.value[key] = true;
    try {
      const res = await pengajuanUangMukaService.getDetail(item.Nomor);
      pumDetailCache.value[key] = res.data;
    } catch {
      toast.error(`Gagal memuat detail ${item.Nomor}`);
    } finally {
      pumDetailLoading.value[key] = false;
    }
  }

  if (activeTab.value === "history") {
    const newlyExpandedBon = newExpanded.filter(
      (item) =>
        item.BonNomor &&
        !penyelesaianDetailCache.value[item.BonNomor] &&
        !penyelesaianDetailLoading.value[item.BonNomor],
    );
    for (const item of newlyExpandedBon) {
      const bonNomor = item.BonNomor;
      penyelesaianDetailLoading.value[bonNomor] = true;
      try {
        const res = await uangMukaPenyelesaianFormService.getFormData(bonNomor);
        penyelesaianDetailCache.value[bonNomor] = res;
      } catch (e) {
        console.error(`Gagal memuat detail penyelesaian ${bonNomor}:`, e);
        penyelesaianDetailCache.value[bonNomor] = null;
      } finally {
        penyelesaianDetailLoading.value[bonNomor] = false;
      }
    }
  }
};

const historyRowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item.Status !== "REALISASI") return {};
  if (Number(item.BonSelesai) === 1) return { style: "color: #212121" };
  return { style: "color: #e53935; font-weight: 600" };
};

const goRealisasi = (item: any) => {
  router.push(
    `/pembelian/uang-muka/realisasi/${encodeURIComponent(item.Nomor)}`,
  );
};

const openPrintHistory = () => {
  const item = selectedPumHistory.value[0];
  if (!item) return;
  window.open(
    `/pembelian/uang-muka/print/${encodeURIComponent(item.Nomor)}`,
    "_blank",
  );
};

const openPrintPenyelesaian = () => {
  const item = selectedPumHistory.value[0];
  if (!item) return;
  window.open(
    `/pembelian/uang-muka/print-penyelesaian/${encodeURIComponent(item.BonNomor)}`,
    "_blank",
  );
};

const goPenyelesaian = () => {
  const item = selectedPumHistory.value[0];
  if (!item) return;
  router.push(
    `/pembelian/uang-muka/penyelesaian/${encodeURIComponent(item.BonNomor)}`,
  );
};
</script>

<template>
  <div class="um-tabs-wrap">
    <div class="um-tabs">
      <button
        v-if="canSeeOutstandingSumber"
        type="button"
        class="um-tab"
        :class="{ active: activeTab === 'outstanding' }"
        @click="activeTab = 'outstanding'"
      >
        Outstanding
      </button>
      <button
        type="button"
        class="um-tab"
        :class="{ active: activeTab === 'pum-outstanding' }"
        @click="activeTab = 'pum-outstanding'"
      >
        Pengajuan Uang Muka
      </button>
      <button
        type="button"
        class="um-tab"
        :class="{ active: activeTab === 'history' }"
        @click="activeTab = 'history'"
      >
        Realisasi Pengajuan UM
      </button>
    </div>

    <!-- TAB OUTSTANDING -->
    <BaseBrowse
      ref="baseBrowseRef"
      v-if="activeTab === 'outstanding'"
      title="Uang Muka — Outstanding"
      menu-id="315"
      :icon="IconCash"
      :headers="outstandingHeaders"
      :items="outstandingItems"
      :is-loading="isLoading"
      v-model:selected="selectedOutstanding"
      select-strategy="page"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="RowKey"
      show-expand
      :expanded="expandedOutstanding"
      @update:expanded="onUpdateExpandedOutstanding"
      @refresh="fetchOutstanding"
      v-model:filterState="filters"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          color="primary"
          size="small"
          :disabled="!canAjukan"
          @click="openAjukanDialog"
        >
          <template #prepend><IconSend :size="15" /></template>
          Ajukan ({{ selectedOutstanding.length }})
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="success"
          :loading="isExportingOutstanding"
          @click="onExportOutstanding"
        >
          <template #prepend><IconFileExport :size="15" /></template>
          Export
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="success"
          :loading="isExportingOutstandingDetail"
          @click="onExportOutstandingDetail"
        >
          <template #prepend><IconListDetails :size="15" /></template>
          Export Detail
        </v-btn>
      </template>

      <template #item.Sumber="{ item }">
        <v-chip
          size="x-small"
          :color="item.Sumber === 'PENGAJUAN_DANA' ? 'blue' : 'orange'"
          variant="flat"
        >
          {{ sumberLabel(item.Sumber) }}
        </v-chip>
      </template>
      <template #item.Nomor="{ item }"
        ><span class="mono">{{ item.Nomor }}</span></template
      >
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.Nominal="{ item }">{{ numFmt(item.Nominal) }}</template>

      <template #detail="{ item }">
        <div class="detail-wrap">
          <v-progress-linear
            v-if="outstandingDetailLoading[item.RowKey]"
            indeterminate
            color="primary"
            height="2"
          />
          <div
            v-else-if="outstandingDetailCache[item.RowKey]"
            class="detail-panel"
          >
            <div class="panel-head">
              Rincian Item —
              <span class="text-warning ml-1">{{ item.Nomor }}</span>
            </div>
            <div class="dtl-scroll">
              <table v-if="item.Sumber === 'PENGAJUAN_DANA'" class="dtl-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Spesifikasi</th>
                    <th class="tc">Satuan</th>
                    <th class="tr">Qty Ajukan</th>
                    <th class="tr">Qty Realisasi</th>
                    <th class="tr">Rp Ajukan</th>
                    <th class="tr">Rp Approved</th>
                    <th class="tc">Status Realisasi</th>
                    <th>Deadline</th>
                    <th>Approved Oleh</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in outstandingDetailCache[item.RowKey]"
                    :key="i"
                  >
                    <td class="fw">{{ d.Nama }}</td>
                    <td>{{ d.Spesifikasi }}</td>
                    <td class="tc">{{ d.Satuan }}</td>
                    <td class="tr">{{ numFmt(d.QtyPengajuan) }}</td>
                    <td class="tr">{{ numFmt(d.QtyRealisasi) }}</td>
                    <td class="tr">{{ numFmt(d.RpPengajuan) }}</td>
                    <td class="tr text-success fw">
                      {{ numFmt(d.RpApproved) }}
                    </td>
                    <td class="tc">
                      <span
                        v-if="
                          statusRealisasiInfo(d.QtyPengajuan, d.QtyRealisasi)
                        "
                        class="status-badge"
                        :style="{
                          background: statusRealisasiInfo(
                            d.QtyPengajuan,
                            d.QtyRealisasi,
                          )!.bg,
                          color: statusRealisasiInfo(
                            d.QtyPengajuan,
                            d.QtyRealisasi,
                          )!.fg,
                        }"
                      >
                        {{
                          statusRealisasiInfo(d.QtyPengajuan, d.QtyRealisasi)!
                            .label
                        }}
                      </span>
                      <span v-else>-</span>
                    </td>
                    <td>{{ tglFmt(d.Deadline) }}</td>
                    <td>{{ d.NameApproved || "-" }}</td>
                    <td style="white-space: normal">{{ d.Keterangan }}</td>
                  </tr>
                  <tr v-if="!outstandingDetailCache[item.RowKey]?.length">
                    <td colspan="11" class="tc" style="color: #999">
                      Tidak ada item tersisa.
                    </td>
                  </tr>
                </tbody>
              </table>

              <table v-else class="dtl-table">
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th>Item</th>
                    <th class="tr">Qty</th>
                    <th>Satuan</th>
                    <th class="tr">Nominal</th>
                    <th class="tr">Qty Realisasi</th>
                    <th class="tr">Nominal Realisasi</th>
                    <th class="tc">Status Realisasi</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in outstandingDetailCache[item.RowKey]"
                    :key="i"
                  >
                    <td class="mono">{{ d.Kode }}</td>
                    <td class="fw">{{ d.Nama }}</td>
                    <td class="tr">{{ numFmt(d.Qty) }}</td>
                    <td>{{ d.Satuan }}</td>
                    <td class="tr">{{ numFmt(d.Nominal) }}</td>
                    <td class="tr">{{ numFmt(d.QtyRealisasi) }}</td>
                    <td class="tr">
                      {{
                        Number(d.QtyRealisasi) > 0
                          ? numFmt(d.NominalRealisasi)
                          : "-"
                      }}
                    </td>
                    <td class="tc">
                      <span
                        v-if="statusRealisasiInfo(d.Qty, d.QtyRealisasi)"
                        class="status-badge"
                        :style="{
                          background: statusRealisasiInfo(
                            d.Qty,
                            d.QtyRealisasi,
                          )!.bg,
                          color: statusRealisasiInfo(d.Qty, d.QtyRealisasi)!.fg,
                        }"
                      >
                        {{ statusRealisasiInfo(d.Qty, d.QtyRealisasi)!.label }}
                      </span>
                      <span v-else>-</span>
                    </td>
                  </tr>
                  <tr v-if="!outstandingDetailCache[item.RowKey]?.length">
                    <td colspan="8" class="tc" style="color: #999">
                      Tidak ada item tersisa.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </BaseBrowse>

    <!-- TAB OUTSTANDING PUM -->
    <BaseBrowse
      ref="baseBrowseRef"
      v-else-if="activeTab === 'pum-outstanding'"
      title="Pengajuan Uang Muka — Outstanding"
      menu-id="315"
      :icon="IconCash"
      :headers="pumHeaders"
      :items="pumOutstandingItems"
      :is-loading="isLoading"
      v-model:selected="selectedPumOutstanding"
      select-strategy="single"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="Nomor"
      show-expand
      :expanded="expandedPum"
      @update:expanded="onUpdateExpandedPum"
      @refresh="fetchPumOutstanding"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
        <div class="f-group">
          <span class="f-label">Cab</span>
          <select v-model="filters.cabFilter" class="f-inp">
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c === "ALL" ? "SEMUA CABANG" : c }}
            </option>
          </select>
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          size="small"
          color="indigo"
          :disabled="!selectedPumOutstanding[0]"
          @click="openPrintPumAjuan"
        >
          <template #prepend><IconPrinter :size="15" /></template>
          Cetak
        </v-btn>
        <v-btn
          v-if="canRealisasi"
          size="small"
          color="teal"
          :disabled="!selectedPumOutstanding[0]"
          @click="goRealisasi(selectedPumOutstanding[0])"
        >
          Realisasi
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="success"
          :loading="isExportingPum"
          @click="onExportPum"
        >
          <template #prepend><IconFileExport :size="15" /></template>
          Export
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="success"
          :loading="isExportingPumDetail"
          @click="onExportPumDetail"
        >
          <template #prepend><IconListDetails :size="15" /></template>
          Export Detail
        </v-btn>
      </template>

      <template #item.Nomor="{ item }"
        ><span class="mono">{{ item.Nomor }}</span></template
      >
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.TotalNominal="{ item }">{{
        numFmt(item.TotalNominal)
      }}</template>
      <template #item.BonNomor="{ item }">-</template>
      <template #item.Status="{ item }">
        <v-chip
          size="x-small"
          :style="{
            backgroundColor: STATUS_LABEL[item.Status]?.bg,
            color: STATUS_LABEL[item.Status]?.color,
          }"
          class="font-weight-bold"
        >
          {{ STATUS_LABEL[item.Status]?.label || item.Status }}
        </v-chip>
      </template>

      <template #detail="{ item }">
        <div class="detail-wrap">
          <v-progress-linear
            v-if="pumDetailLoading[item.Nomor]"
            indeterminate
            color="primary"
            height="2"
          />
          <div v-else-if="pumDetailCache[item.Nomor]" class="detail-panel">
            <div class="panel-head">
              Rincian — <span class="text-warning ml-1">{{ item.Nomor }}</span>
            </div>
            <div class="dtl-scroll">
              <table class="dtl-table">
                <thead>
                  <tr>
                    <th>Sumber</th>
                    <th>Nomor</th>
                    <th>Item</th>
                    <th class="tr">Qty</th>
                    <th>Keterangan</th>
                    <th class="tr">Nominal Sumber</th>
                    <th class="tc">Status ACC</th>
                    <th class="tr">Nominal ACC</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(d, i) in pumDetailCache[item.Nomor]"
                    :key="i"
                    :class="{ 'row-kasbon': d.Sumber === 'KASBON' }"
                  >
                    <td>
                      <v-chip
                        v-if="d.Sumber !== 'KASBON'"
                        size="x-small"
                        :color="
                          d.Sumber === 'PENGAJUAN_DANA' ? 'blue' : 'orange'
                        "
                        variant="flat"
                        >{{ sumberLabel(d.Sumber) }}</v-chip
                      >
                      <span v-else class="font-weight-bold">KASBON</span>
                    </td>
                    <td class="mono">{{ d.NomorSumber }}</td>
                    <td>{{ d.Nama }}</td>
                    <td class="tr">
                      <template v-if="d.Sumber !== 'KASBON'"
                        >{{ numFmt(d.Qty) }} {{ d.Satuan }}</template
                      >
                    </td>
                    <td>{{ d.Keterangan }}</td>
                    <td class="tr fw">
                      {{
                        numFmt(
                          d.Sumber === "KASBON"
                            ? d.NominalAjuan
                            : d.NominalSumber,
                        )
                      }}
                    </td>
                    <td class="tc">{{ d.StatusAcc || "-" }}</td>
                    <td class="tr fw">
                      {{ d.NominalAcc != null ? numFmt(d.NominalAcc) : "-" }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </template>
    </BaseBrowse>

    <!-- TAB HISTORY -->
    <BaseBrowse
      ref="baseBrowseRef"
      v-else
      title="Pengajuan Uang Muka — History"
      menu-id="315"
      :icon="IconCash"
      :headers="historyHeaders"
      :items="pumHistoryItems"
      :is-loading="isLoading"
      v-model:selected="selectedPumHistory"
      select-strategy="single"
      :can-insert="false"
      :can-edit="false"
      :can-delete="false"
      :can-export="false"
      item-value="RowKey"
      show-expand
      :expanded="expandedPum"
      @update:expanded="onUpdateExpandedPum"
      @refresh="fetchPumHistory"
      :row-props-fn="historyRowPropsFn"
    >
      <template #filter-left>
        <div class="f-group">
          <span class="f-label">Periode</span>
          <input type="date" v-model="filters.dtAwal" class="f-inp" />
          <span class="f-sep">s/d</span>
          <input type="date" v-model="filters.dtAkhir" class="f-inp" />
        </div>
        <div class="f-group">
          <span class="f-label">Cab</span>
          <select v-model="filters.cabFilter" class="f-inp">
            <option v-for="c in CABANG_LIST" :key="c" :value="c">
              {{ c === "ALL" ? "SEMUA CABANG" : c }}
            </option>
          </select>
        </div>
      </template>

      <template #extra-actions>
        <v-btn
          size="small"
          color="indigo"
          :disabled="
            !selectedPumHistory[0] ||
            selectedPumHistory[0].Status !== 'REALISASI' ||
            !selectedPumHistory[0].Nomor
          "
          @click="openPrintHistory"
        >
          <template #prepend><IconPrinter :size="15" /></template>
          Cetak Realisasi
        </v-btn>
        <v-btn
          size="small"
          color="deep-orange"
          :disabled="
            !selectedPumHistory[0] ||
            selectedPumHistory[0].Status !== 'REALISASI'
          "
          @click="goPenyelesaian"
        >
          Lanjut ke Penyelesaian
        </v-btn>
        <v-btn
          size="small"
          color="teal-darken-2"
          :disabled="
            !selectedPumHistory[0] ||
            selectedPumHistory[0].Status !== 'REALISASI' ||
            Number(selectedPumHistory[0].BonSelesai) !== 1
          "
          @click="openPrintPenyelesaian"
        >
          <template #prepend><IconPrinter :size="15" /></template>
          Cetak Penyelesaian
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="success"
          :loading="isExportingHistory"
          @click="onExportHistory"
        >
          <template #prepend><IconFileExport :size="15" /></template>
          Export
        </v-btn>
        <v-btn
          size="small"
          variant="outlined"
          color="success"
          :loading="isExportingHistoryDetail"
          @click="onExportHistoryDetail"
        >
          <template #prepend><IconListDetails :size="15" /></template>
          Export Detail
        </v-btn>
      </template>

      <template #item.Nomor="{ item }">
        <span class="mono">{{ item.Nomor || "-" }}</span>
      </template>
      <template #item.Tanggal="{ item }">{{ tglFmt(item.Tanggal) }}</template>
      <template #item.TotalNominal="{ item }">{{
        numFmt(item.TotalNominal)
      }}</template>
      <template #item.BonNomor="{ item }"
        ><span class="mono">{{ item.BonNomor || "-" }}</span></template
      >
      <template #item.Jenis="{ item }">{{
        (item.raw || item).Jenis || "-"
      }}</template>
      <template #item.Account="{ item }">{{
        (item.raw || item).Account || "-"
      }}</template>
      <template #item.Pjh="{ item }">
        <span class="mono">{{ (item.raw || item).Pjh || "-" }}</span>
      </template>
      <template #item.Nota="{ item }">{{
        (item.raw || item).Nota || "-"
      }}</template>
      <template #item.Penerima="{ item }">{{
        (item.raw || item).Penerima || "-"
      }}</template>
      <template #item.Terpakai="{ item }">{{
        numFmt((item.raw || item).Terpakai)
      }}</template>
      <template #item.Sisa="{ item }">{{
        numFmt((item.raw || item).Sisa)
      }}</template>
      <template #item.NoBukti="{ item }">
        <span class="mono">{{ (item.raw || item).NoBukti || "-" }}</span>
      </template>
      <template #item.SelesaiLabel="{ item }">
        <v-chip
          size="x-small"
          :color="
            Number((item.raw || item).BonSelesai) === 1 ? 'success' : 'error'
          "
          variant="flat"
        >
          {{ selesaiLabel((item.raw || item).BonSelesai) }}
        </v-chip>
      </template>
      <template #item.ClosedLabel="{ item }">
        <v-chip
          size="x-small"
          :color="(item.raw || item).Closed ? 'success' : 'warning'"
          variant="flat"
        >
          {{ closedLabel((item.raw || item).Closed) }}
        </v-chip>
      </template>
      <template #item.DibuatOleh="{ item }">{{
        (item.raw || item).DibuatOleh || "-"
      }}</template>
      <template #item.TglDibuat="{ item }">{{
        (item.raw || item).TglDibuat || "-"
      }}</template>
      <template #item.Status="{ item }">
        <v-chip
          size="x-small"
          :style="{
            backgroundColor: STATUS_LABEL[item.Status]?.bg,
            color: STATUS_LABEL[item.Status]?.color,
          }"
          class="font-weight-bold"
        >
          {{ STATUS_LABEL[item.Status]?.label || item.Status }}
        </v-chip>
      </template>

      <template #detail="{ item }">
        <div class="detail-wrap">
          <div class="detail-side-by-side">
            <div class="detail-col">
              <template v-if="item.Nomor">
                <v-progress-linear
                  v-if="pumDetailLoading[item.RowKey]"
                  indeterminate
                  color="primary"
                  height="2"
                />
                <div
                  v-else-if="pumDetailCache[item.RowKey]"
                  class="detail-panel"
                >
                  <div class="panel-head">
                    Detail Pengajuan Uang Muka —
                    <span class="text-warning ml-1">{{ item.Nomor }}</span>
                  </div>
                  <div class="dtl-scroll">
                    <table class="dtl-table">
                      <thead>
                        <tr>
                          <th>Sumber</th>
                          <th>Nomor</th>
                          <th>Keterangan</th>
                          <th class="tr">Nominal Sumber</th>
                          <th class="tr">Nominal Ajuan</th>
                          <th class="tc">Status ACC</th>
                          <th class="tr">Nominal ACC</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="(d, i) in pumDetailCache[item.RowKey]"
                          :key="i"
                        >
                          <td>
                            <v-chip
                              v-if="d.Sumber !== 'KASBON'"
                              size="x-small"
                              :color="
                                d.Sumber === 'PENGAJUAN_DANA'
                                  ? 'blue'
                                  : 'orange'
                              "
                              variant="flat"
                            >
                              {{ sumberLabel(d.Sumber) }}
                            </v-chip>
                            <span v-else class="font-weight-bold">KASBON</span>
                          </td>
                          <td class="mono">{{ d.NomorSumber }}</td>
                          <td>{{ d.Keterangan }}</td>
                          <td
                            class="tr"
                            :class="{
                              'text-warning fw':
                                Number(d.NominalSumber) !==
                                Number(d.NominalAjuan),
                            }"
                          >
                            {{ numFmt(d.NominalSumber) }}
                          </td>
                          <td class="tr">{{ numFmt(d.NominalAjuan) }}</td>
                          <td class="tc">{{ d.StatusAcc || "-" }}</td>
                          <td class="tr fw">
                            {{
                              d.NominalAcc != null ? numFmt(d.NominalAcc) : "-"
                            }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </template>
              <div v-else class="detail-panel">
                <div class="panel-head">Kasbon Lama</div>
                <div class="pa-3 text-medium-emphasis">
                  Kasbon lama — dibuat langsung tanpa Pengajuan Uang Muka, tidak
                  ada detail sumber pengajuan.
                </div>
              </div>
            </div>

            <div class="detail-col" v-if="item.BonNomor">
              <div class="detail-panel">
                <div class="panel-head" style="background: #263238">
                  Detail Penyelesaian Uang Muka —
                  <span class="text-warning ml-1">{{ item.BonNomor }}</span>
                </div>
                <v-progress-linear
                  v-if="penyelesaianDetailLoading[item.BonNomor]"
                  indeterminate
                  color="primary"
                  height="2"
                />
                <div
                  v-else-if="
                    penyelesaianDetailCache[item.BonNomor]?.detail?.length
                  "
                  class="dtl-scroll"
                >
                  <table class="dtl-table">
                    <thead>
                      <tr>
                        <th>No.Pengajuan</th>
                        <th>Uraian</th>
                        <th>Satuan</th>
                        <th class="tr">Qty Minta</th>
                        <th class="tr">Qty Beli</th>
                        <th class="tr">Nominal Satuan</th>
                        <th class="tr">Total</th>
                        <th class="tc">Ver</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(d, i) in penyelesaianDetailCache[item.BonNomor]
                          .detail"
                        :key="i"
                      >
                        <td class="mono">{{ d.pjh || d.pjh_link || "-" }}</td>
                        <td>{{ d.uraian }}</td>
                        <td>{{ d.satuan }}</td>
                        <td class="tr">{{ numFmt(d.qty_minta) }}</td>
                        <td class="tr fw">{{ numFmt(d.qty) }}</td>
                        <td class="tr">{{ numFmt(d.harga) }}</td>
                        <td class="tr fw">{{ numFmt(d.total) }}</td>
                        <td class="tc">
                          <v-chip
                            size="x-small"
                            :color="d.verified ? 'success' : 'grey'"
                            variant="flat"
                          >
                            {{ d.verified ? "✓" : "-" }}
                          </v-chip>
                        </td>
                      </tr>
                    </tbody>
                    <tfoot class="sticky-foot">
                      <tr>
                        <td colspan="6" class="tr fw">Total Penyelesaian</td>
                        <td class="tr fw">
                          {{
                            numFmt(
                              penyelesaianDetailCache[
                                item.BonNomor
                              ].detail.reduce(
                                (s: number, d: any) => s + Number(d.total || 0),
                                0,
                              ),
                            )
                          }}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <div v-else class="pa-3" style="font-size: 11px; color: #999">
                  Belum ada data penyelesaian untuk Bon ini.
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </BaseBrowse>
  </div>

  <!-- DIALOG AJUKAN -->
  <v-dialog v-model="showAjukanDialog" max-width="900px" persistent>
    <v-card class="rounded-lg">
      <v-card-title
        class="bg-primary text-white pa-3"
        style="font-size: 13px; font-weight: 700"
      >
        Ajukan Uang Muka
      </v-card-title>
      <v-card-text class="pa-4">
        <div class="d-flex gap-2 mb-3">
          <v-text-field
            v-model="ajukanTanggal"
            type="date"
            label="Tanggal"
            variant="outlined"
            density="compact"
            hide-details
            style="max-width: 220px"
          />
        </div>
        <v-textarea
          v-model="ajukanKeterangan"
          label="Keterangan"
          variant="outlined"
          density="compact"
          rows="2"
          hide-details="auto"
          class="mb-3"
        />

        <v-progress-linear
          v-if="isLoadingAjukanDetail"
          indeterminate
          color="primary"
          class="mb-2"
        />

        <div class="panel-head" style="border-radius: 4px">
          Rincian Pengajuan
        </div>
        <div class="dtl-scroll" style="max-height: 280px; overflow-y: auto">
          <table class="dtl-table ajukan-table">
            <thead>
              <tr>
                <th style="width: 40px">No</th>
                <th style="width: 130px">Nomor</th>
                <th>Item</th>
                <th style="width: 90px" class="tr">Qty</th>
                <th style="width: 150px" class="tr">Nominal Sumber</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(r, i) in ajukanItems"
                :key="`${r.NomorHeader}-${r.ItemNourut}`"
              >
                <td class="tc">{{ i + 1 }}</td>
                <td class="mono">{{ r.NomorHeader }}</td>
                <td class="wrap-cell">{{ r.Nama }}</td>
                <td class="tr">{{ r.Qty }} {{ r.Satuan }}</td>
                <td class="tr">{{ numFmt(r.NominalSumber) }}</td>
              </tr>
            </tbody>
            <tfoot class="sticky-foot">
              <tr>
                <td colspan="4" class="tr fw">Total Nominal Sumber</td>
                <td class="tr fw">{{ numFmt(ajukanTotalSumber) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </v-card-text>
      <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
        <div class="d-flex align-center" style="gap: 8px">
          <span class="text-caption font-weight-bold"
            >Nominal Diajukan ke Finance:</span
          >
          <div class="nominal-ajuan-wrap">
            <NumberInputIDR v-model="ajukanNominalDiajukan" cursor-to-end />
          </div>
        </div>
        <v-spacer />
        <v-btn
          variant="text"
          @click="showAjukanDialog = false"
          :disabled="isSubmittingAjukan"
          >Batal</v-btn
        >
        <v-btn
          variant="elevated"
          color="primary"
          :loading="isSubmittingAjukan"
          @click="submitAjukan"
        >
          Ajukan
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="showAjukanPrintDialog" max-width="380" persistent>
    <v-card rounded="lg">
      <v-card-title
        class="pa-4 pb-2"
        style="font-size: 13px; font-weight: 700; border-top: 3px solid #2e7d32"
      >
        <IconCheck :size="16" color="#2e7d32" style="margin-right: 6px" />
        Pengajuan Berhasil Dibuat
      </v-card-title>
      <v-card-text class="pa-4 pt-2" style="font-size: 12px">
        No. PUM: <strong>{{ savedPumNomor }}</strong
        ><br />
        Cetak bukti untuk diserahkan ke Finance?
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-btn variant="text" @click="showAjukanPrintDialog = false"
          >Tidak</v-btn
        >
        <v-spacer />
        <v-btn color="primary" variant="flat" @click="cetakBuktiPengajuan">
          <template #prepend><IconPrinter :size="14" /></template>
          Cetak Bukti
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.um-tabs-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.um-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 8px 0;
  flex-shrink: 0;
}
.um-tab {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 700;
  border: none;
  background: transparent;
  color: #757575;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.um-tab.active {
  color: #1565c0;
  border-bottom-color: #1565c0;
}
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
.f-inp {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
  background: white;
}
.f-sep {
  font-size: 11px;
  color: #555;
}
.mono {
  font-family: monospace;
  font-weight: 600;
}
.gap-2 {
  gap: 8px;
}

.detail-wrap {
  padding: 10px 14px 16px;
  background: #f5f7fb;
  border-top: 2px solid #dde3ea;
}
.detail-panel {
  background: white;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #cfd8dc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
.panel-head {
  display: flex;
  align-items: center;
  background: #37474f;
  color: white;
  padding: 8px 12px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.02em;
}
.dtl-scroll {
  overflow-x: auto;
}
.dtl-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.dtl-table thead th {
  background: #eceff1;
  color: #37474f;
  padding: 6px 10px;
  text-align: left;
  font-weight: 700;
  border-bottom: 2px solid #b0bec5;
  border-right: 1px solid #dde3ea;
  white-space: nowrap;
}
.dtl-table tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  border-right: 1px solid #f0f0f0;
  vertical-align: middle;
  white-space: nowrap;
}
.dtl-table tfoot td {
  padding: 6px 10px;
  border-top: 2px solid #b0bec5;
}
.tc {
  text-align: center !important;
}
.tr {
  text-align: right !important;
}
.fw {
  font-weight: 700;
}
.ajukan-table td.wrap-cell {
  white-space: normal;
  word-break: break-word;
}
.nominal-inp {
  width: 100%;
  text-align: right;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 12px;
}
.nominal-inp:focus {
  border-color: #1565c0;
  outline: none;
}
.sticky-foot {
  position: sticky;
  bottom: 0;
  z-index: 2;
}
.sticky-foot td {
  background: white;
  box-shadow: 0 -1px 0 #b0bec5;
}
.nominal-ajuan-wrap {
  width: 180px;
}
.nominal-ajuan-wrap :deep(input) {
  width: 100%;
  height: 34px;
  border: 1.5px solid #1565c0;
  border-radius: 4px;
  padding: 0 10px;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
  background: white;
  outline: none;
  color: #212121;
}
.nominal-ajuan-wrap :deep(input:focus) {
  border-color: #0d47a1;
  box-shadow: 0 0 0 2px rgba(21, 101, 192, 0.15);
}
.row-kasbon td {
  background: #e3f2fd !important;
  font-weight: 700;
}
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.detail-side-by-side {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.detail-col {
  flex: 1;
  min-width: 0;
}
</style>
