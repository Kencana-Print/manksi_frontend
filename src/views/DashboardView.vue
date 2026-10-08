<script setup lang="ts">
import {
  ref,
  reactive,
  provide,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  type Ref,
} from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { dashboardService } from "@/services/dashboard/dashboardService";
import {
  IconX,
  IconClipboardList,
  IconFileAlert,
  IconRefresh,
  IconChartBar,
  IconTruckDelivery,
  IconWalk,
  IconLayoutDashboard,
  IconCoin,
  IconChevronRight,
  IconPackage,
  IconAlertTriangle,
  IconTrendingUp,
  IconActivity,
  IconGauge,
  IconScale,
  IconArrowsExchange,
  IconBoxSeam,
  IconFileInvoice,
  IconFileSpreadsheet,
  IconShoppingCart,
} from "@tabler/icons-vue";
import AiChatWidget from "@/components/AiChatWidget.vue";
import DashState from "@/components/dashboard/DashState.vue";
import ProductionFlow from "@/components/dashboard/ProductionFlow.vue";
import api from "@/services/api";
import { exportExcelSingle } from "@/utils/excelExport";
import { exportExcelMulti } from "@/utils/excelExportMulti";
import { formatTanggalJam } from "@/utils/dateFormat";
import { swr, setSnapshotScope, hasSnapshot } from "@/utils/snapshot";
import { runFresh } from "@/utils/freshMode";

interface OverdueItem {
  Invoice: string;
  Customer: string;
  Tempo: string;
  TerlambatHari: number;
  SisaTagihan: number;
}
interface Top5Item {
  Customer: string;
  Saldo: number;
}
interface TrendItem {
  Bulan: string;
  TotalTagihan: number;
  TotalPenerimaan: number;
}
interface PiutangData {
  summary: {
    TotalDebet: number;
    TotalKredit: number;
    TotalOutstanding: number;
    InvoiceBulanIni: number;
    TerimaBulanIni: number;
    overdueTotal: number;
  };
  top5: Top5Item[];
  overdue: OverdueItem[];
  trend: TrendItem[];
}
interface TargetCollectionItem {
  salKode: string;
  namaSales: string;
  targetBulanIni: number;
  targetPiutangLama: number;
  targetTotal: number;
  piutangSaatIni: number;
  piutangRealtime: number;
  collectionMtd: number;
  collectionYtd: number;
  sisaCollectionMtd: number;
  pctCollectionMtd: number | null;
  pctCollectionYtd: number | null;
}

interface TargetCollectionGrandTotal {
  targetBulanIni: number;
  targetPiutangLama: number;
  targetTotal: number;
  piutangSaatIni: number;
  piutangRealtime: number;
  collectionMtd: number;
  collectionYtd: number;
  sisaCollectionMtd: number;
  pctCollectionMtd: number | null;
  pctCollectionYtd: number | null;
}
interface TargetCollectionData {
  bulan: number;
  tahun: number;
  targetBulanLabel: string;
  items: TargetCollectionItem[];
  grandTotal: TargetCollectionGrandTotal;
}
interface GudangBahanMetric {
  TotalJenis: number;
  JmlBawahBuffer: number;
  TotalBarcode: number;
  JmlMinus: number;
}
interface BufferItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Buffer: number;
  StokAkhir: number;
}
interface StokItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Buffer: number;
  StokAkhir: number;
}
interface BahanBarcodeItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Buffer: number;
  Masuk: number;
  Keluar: number;
  Stok: number;
}
interface GudangBahanData {
  metric: GudangBahanMetric;
  detailBawahBuffer: BufferItem[];
  topStok: StokItem[];
  bahanBarcode: BahanBarcodeItem[];
}
interface RealisasiMetric {
  TotalPenawaran: number;
  KonversiCepat: number;
  KonversiNormal: number;
  KonversiLambat: number;
  KonversiSangatLambat: number;
  BelumKonversi: number;
  Batal: number;
  RataRataHari: number;
}
interface RealisasiTren {
  Bulan: string;
  TotalPenawaran: number;
  Konversi: number;
  RataRataHari: number;
}
interface RealisasiDistribusi {
  Bucket: string;
  Jumlah: number;
}
interface RealisasiData {
  metric: RealisasiMetric;
  tren: RealisasiTren[];
  distribusi: RealisasiDistribusi[];
  tabelDetail: {
    NomorPenawaran: string;
    TglPenawaran: string;
    Customer: string;
    TotalSPK: number;
    SpkPertama: string | null;
    TglSpkPertama: string | null;
    HariKonversi: number | null;
  }[];
}
interface PipelineData {
  TotalMasuk: number;
  AdaMkb: number;
  AdaRealisasi: number;
  AdaLhk: number;
  AdaStbj: number;
  AdaKirim: number;
}
interface BahanKurangBahan {
  Kode: string;
  NamaBahan: string;
  Satuan: string;
  Kurang: number;
}
interface BahanKurangItem {
  Nomor: string;
  NamaSpk: string;
  JmlBahanKurang: number;
  bahanList: BahanKurangBahan[];
}
interface SpkBelumMkbItem {
  Nomor: string;
  Nama: string;
  Tanggal: string;
  Dateline: string;
  SisaHari: number;
}
interface PoJasaVsBpjData {
  TotalPO: number;
  Belum: number;
  Proses: number;
  Closed: number;
}
interface OutstandingMitraItem {
  Kode: string;
  Supplier: string;
  Jasa: string;
  Po: number;
  Terima: number;
  Kurang: number;
  Target: number;
  Otm: number;
}
interface EfisiensiBabaranItem {
  Nomor: string;
  Nama: string;
  Customer: string;
  Minus: number;
  Status: string;
}
interface StokAccVsMkaSpk {
  NomorMka: string;
  Spk: string;
  NamaSpk: string;
  Mka: number;
  Realisasi: number;
  Sisa: number;
}
interface StokAccVsMkaItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  StokAcc: number;
  Mka: number;
  Free: number;
  spkList: StokAccVsMkaSpk[];
}
interface BarangJadiMetric {
  TotalItem: number;
  TotalStok: number;
  ItemBergerak: number;
  ItemMinus: number;
}
interface StokBarangJadiItem {
  Kode: string;
  Nama: string;
  Ukuran: string;
  Gudang: string;
  Stok: number;
  Customer: string;
}
interface MutasiBarangJadiItem {
  Kode: string;
  Nama: string;
  Ukuran: string;
  Stbj: number;
  MutasiMasuk: number;
  Koreksi: number;
  SuratJalan: number;
  MutasiKeluar: number;
  StokAkhir: number;
}
interface PipelinePenyelesaianSpk {
  TotalAktif: number;
  SudahStbj: number;
  SudahKirim: number;
  FullInvoice: number;
}
interface SpkVsStbjSummary {
  TotalAktif: number;
  SudahStbj: number;
  BelumStbj: number;
  RataRataHari: number | null;
}
interface SpkBelumStbjItem {
  Nomor: string;
  Nama: string;
  Tanggal: string;
  Dateline: string;
  SisaHari: number;
}
interface SpkVsSjSummary {
  TotalAktif: number;
  BelumKirim: number;
  SebagianKirim: number;
  LunasKirim: number;
  TotalQtyOrder: number;
  TotalQtyKirim: number;
}
interface SpkBelumKirimItem {
  Nomor: string;
  Nama: string;
  NamaCustomer: string;
  Dateline: string;
  QtyOrder: number;
  QtyKirim: number;
}
interface SpkBelumTagihSummary {
  TotalTerkirim: number;
  BelumInvoice: number;
  SebagianInvoice: number;
  FullInvoice: number;
  TotalQtyBelumDitagih: number;
}
interface SpkBelumTagihItem {
  Nomor: string;
  Nama: string;
  NamaCustomer: string;
  QtyKirim: number;
  QtyInvoice: number;
  QtyBelumDitagih: number;
  TglKirimTerakhir: string;
  UmurHari: number;
}
interface StokBebasItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Stok: number;
  MkbBelumRealisasi: number;
  Free: number;
}
interface BufferKaosanItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Buffer: number;
  StokAkhir: number;
  Tipe: "BAHAN" | "AKSESORIS";
}

// Sinkron dengan token --dsh-* di <style>. Harus hex 6 digit karena
// ada yang ditambah suffix alpha (mis. C.accent + "22") dan dipakai chart c3.
const C = {
  accent: "#1565c0",
  accentMid: "#9cc0f0",
  good: "#1f8a4c",
  goodSoft: "#e6f5ec",
  warn: "#b86500",
  warnSoft: "#fdf1dc",
  bad: "#d03a34",
  badSoft: "#fdecea",
  neutral: "#5b6479",
  slate: "#3a4354",
  track: "#d5dae3",
} as const;

const authStore = useAuthStore();
setSnapshotScope(authStore.user?.kode);
// Ambil payload `data.data` dari response API; tipe hasil ditentukan pemanggil
const payload = <T = unknown,>(
  req: Promise<{ data: { data: unknown } }>,
): Promise<T> => req.then((res) => res.data.data as T);

// ── Status muat: gagal, sedang memperbarui, waktu terakhir berhasil ──
const loadFailed = reactive<Record<string, boolean>>({});
const pendingSnaps = ref(0);
const lastUpdatedAt = ref<number | null>(null);
const nowTick = ref(Date.now());
let nowTickTimer: ReturnType<typeof setInterval> | null = null;

// Tipe data diambil dari parameter `apply`. Tidak pernah melempar error,
// tetapi kegagalan dicatat di loadFailed[key] supaya bisa ditampilkan.
const snap = <T,>(
  key: string,
  fetcher: () => Promise<unknown>,
  apply: (v: T) => void,
): Promise<void> => {
  pendingSnaps.value++;
  loadFailed[key] = false;
  return swr<T>(key, async () => (await fetcher()) as T, apply)
    .then(() => {
      lastUpdatedAt.value = Date.now();
    })
    .catch(() => {
      loadFailed[key] = true;
    })
    .finally(() => {
      pendingSnaps.value--;
    });
};
const AI_CHAT_ALLOWED_KODE = [
  "DARUL",
  "DIR",
  "ADMIN",
  "RIO",
  "EDI",
  "WIDI",
  "HARIS",
];
const canAccessAiChat = computed(() =>
  AI_CHAT_ALLOWED_KODE.includes((authStore.user?.kode || "").toUpperCase()),
);
const router = useRouter();
const isSpkDialogVisible = ref(false);
const isBapAuditDialogVisible = ref(false);
const isPraOrderPpicDialogVisible = ref(false);
const isBapReviewedDialogVisible = ref(false);
const hasReadBapReviewed = ref(false);
const activeTab = ref("overview");

// Nama panel untuk banner kegagalan. Kunci = akhiran isLoadingMore<Kunci>.
const PANEL_META: Record<string, { label: string; tab: string }> = {
  Akt: { label: "Aktivitas hari ini", tab: "overview" },
  Pen: { label: "Penawaran belum SO", tab: "marketing" },
  Map: { label: "Penawaran belum MAP", tab: "marketing" },
  PbBatal: { label: "Penawaran batal", tab: "marketing" },
  MapSpk: { label: "MAP belum SO", tab: "marketing" },
  PtmDetail: { label: "Penawaran → MAP", tab: "marketing" },
  MtsDetail: { label: "MAP → SO", tab: "marketing" },
  Potensi: { label: "Proyeksi potensial", tab: "marketing" },
  PotensiBatal: { label: "Proyeksi potensial batal", tab: "marketing" },
  InkasoBatal: { label: "Proyeksi inkaso batal", tab: "marketing" },
  Overdue: { label: "Invoice jatuh tempo", tab: "finance" },
  SpkTagih: { label: "SPK terkirim belum ditagih", tab: "finance" },
  Msp: { label: "MAP/SPK belum ada permintaan bahan", tab: "gudang-bahan" },
  Pbr: { label: "Permintaan bahan belum direalisasi", tab: "gudang-bahan" },
  Pbd: { label: "PO bahan belum datang", tab: "gudang-bahan" },
  GbMkb: { label: "SO belum ada MKB", tab: "gudang-bahan" },
  GbMka: { label: "MKA belum direalisasi", tab: "gudang-bahan" },
  Buffer: { label: "Bahan penolong di bawah buffer", tab: "gudang-bahan" },
  Bahan: { label: "Stok bahan utama", tab: "gudang-bahan" },
  StokAccVsMka: {
    label: "Stok aksesoris vs kebutuhan MKA",
    tab: "gudang-bahan",
  },
  Sb: { label: "Stok bebas", tab: "gudang-bahan" },
  Bk: { label: "Buffer bahan & aksesoris KAOSAN", tab: "gudang-bahan" },
  BahanKurang: { label: "Bahan kurang untuk produksi", tab: "gudang" },
  SpkBelumMkb: { label: "SO belum ada MKB", tab: "gudang" },
  Outstanding: { label: "Outstanding PO mitra", tab: "gudang" },
  Efisiensi: { label: "Efisiensi babaran", tab: "gudang" },
  SpkStbj: { label: "SPK belum STBJ", tab: "gudang" },
  SpkSj: { label: "Status pengiriman SPK", tab: "gudang" },
  StokBj: { label: "Stok barang jadi", tab: "barang-jadi" },
  MutasiBj: { label: "Mutasi barang jadi", tab: "barang-jadi" },
  Ob: { label: "Outstanding beli", tab: "pembelian" },
};

const tabOfKey = (key: string): string | null => {
  const meta = PANEL_META[key];
  if (meta) return meta.tab;
  if (key.startsWith("ov:")) return "overview";
  if (key.startsWith("mkt:")) return "marketing";
  // Target Collection tampil di Marketing dan Finance
  if (key.startsWith("tc:"))
    return activeTab.value === "finance" ? "finance" : "marketing";
  // dimuat hanya dari tab Marketing
  if (key === "slow-dead-stock" || key === "konversi-babaran")
    return "marketing";
  return null;
};

const failedPanelLabels = computed(() => {
  const labels = new Set<string>();
  let ringkasan = 0;
  for (const [key, failed] of Object.entries(loadFailed)) {
    if (!failed || tabOfKey(key) !== activeTab.value) continue;
    const meta = PANEL_META[key];
    if (meta) labels.add(meta.label);
    else ringkasan++;
  }
  const out = [...labels];
  if (ringkasan) out.push(`${ringkasan} ringkasan angka`);
  return out;
});

provide(
  "dashHasFailures",
  computed(() => failedPanelLabels.value.length > 0),
);

const refreshLabel = computed(() => {
  if (pendingSnaps.value > 0) return "Memperbarui…";
  if (!lastUpdatedAt.value) return "";
  const menit = Math.floor((nowTick.value - lastUpdatedAt.value) / 60000);
  if (menit < 1) return "Diperbarui baru saja";
  if (menit < 60) return `Diperbarui ${menit} menit lalu`;
  return `Diperbarui ${Math.floor(menit / 60)} jam lalu`;
});

watch(activeTab, async (tab) => {
  if (tab === "overview") {
    await nextTick();
    if (trendData.value.length) renderTrendChart();
    setupAktObserver();
  }
  if (tab === "marketing") {
    if (!marketingLoaded.value) await loadMarketingData();
    await nextTick();
    setupPenObserver();
    setupMapObserver();
    setupPbBatalObserver();
    setupRpDetailObserver();
    setupMapSpkObserver();
    setupMapKirimObserver();
    setupPvrObserver();
    setupPtmDetailObserver();
    setupMtsDetailObserver();
    setupPotensiListObserver();
    setupPotensiBatalListObserver();
    setupInkasoBatalObserver();
  }
  if (tab === "finance") {
    if (!financeLoaded.value) await loadFinanceData();
    await nextTick();
    setupOverdueObserver();
    setupSpkTagihObserver();
  }
  if (tab === "gudang-bahan") {
    if (!gudangBahanLoaded.value) await loadGudangBahanData();
    await nextTick();
    setupMspObserver();
    setupPbrObserver();
    setupPbdObserver();
    setupGbMkbObserver();
    setupGbMkaObserver();
    setupBufferObserver();
    setupBahanObserver();
    setupStokAccVsMkaObserver();
    setupSbObserver();
    setupBkObserver();
  }
  if (tab === "gudang") {
    if (!gudangLoaded.value) await loadGudangData();
    await setupGudangObservers();
  }
  if (tab === "barang-jadi") {
    if (!barangJadiLoaded.value) await loadBarangJadiData();
    await nextTick();
    setupStokBjObserver();
    setupMutasiBjObserver();
  }
  if (tab === "pembelian") {
    if (!pembelianLoaded.value) await loadPembelianData();
    await nextTick();
    setupObObserver();
  }
});

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));
const fmtDec = (val: number, d = 2) =>
  Number(val || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
// ⬅ BARU: tampilkan surplus (target sudah terlampaui) dengan tanda "+",
// bukan angka negatif yang membingungkan — nilai aslinya tetap sama,
// cuma cara render-nya yang beda.
const fmtSisaCollection = (val: number) => {
  if (val < 0) return `+${fmtNum(Math.abs(val))}`;
  return fmtNum(val);
};
const fmtPct = (val: number | null) =>
  val === null ? "—" : `${val >= 100 ? Math.round(val) : fmtDec(val, 1)}%`;
const pctColor = (val: number | null) => {
  if (val === null) return C.neutral;
  if (val >= 80) return C.good;
  if (val >= 50) return C.warn;
  return C.bad;
};

// ── Role helpers ──
const bagian = computed(() =>
  (authStore.user?.bagian || "").toUpperCase().trim(),
);
const cabang = computed(() =>
  (authStore.user?.cabang || "").toUpperCase().trim(),
);
const isSuperViewer = computed(() =>
  ["EDP", "DIREKSI", "OWNER", "IT", "AUDIT"].includes(bagian.value),
);
const showPenawaran = computed(
  () =>
    (["MARKETING", "FINANCE"].includes(bagian.value) &&
      cabang.value !== "P03") ||
    isSuperViewer.value,
);
const showPoBpb = computed(
  () =>
    ["PEMBELIAN", "GUDANG", "PPIC"].includes(bagian.value) ||
    isSuperViewer.value,
);
const showPiutang = computed(() =>
  ["FINANCE", "DIREKSI", "OWNER", "AUDIT", "EDP", "IT"].includes(bagian.value),
);
const showGudangBahan = computed(
  () =>
    ["PEMBELIAN", "GUDANG", "PPIC"].includes(bagian.value) ||
    isSuperViewer.value ||
    authStore.user?.kode?.toUpperCase() === "NANDA",
);
const showBarangJadi = computed(
  () =>
    ["ADMIN", "PRODUKSI", "PPIC"].includes(bagian.value) || isSuperViewer.value,
);
const showPembelian = computed(
  () => ["PEMBELIAN", "FINANCE"].includes(bagian.value) || isSuperViewer.value,
);

// ── State Dashboard ──
const mapSummary = ref({
  TotalPenawaran: 0,
  SudahMAP: 0,
  BelumMAP: 0,
  BelumMAPAdaClose: 0,
  Close: 0,
  Batal: 0,
});
const penawaranBelumMap = ref<any[]>([]);
const penSummary = ref({ TotalPenawaran: 0, SudahSpk: 0, BelumSpk: 0 });
const penawaranBelumSpk = ref<any[]>([]);
const spkSummary = ref({
  TotalAktif: 0,
  Terlambat: 0,
  DeadlineHariIni: 0,
  SegeredDeadline: 0,
  Selesai: 0,
});
const soSummary = ref({
  TotalAktif: 0,
  BelumSpk: 0,
  BelumKirim: 0,
  BelumJadi: 0,
});
const soAktifTrend = ref<{ delta: number | null }>({ delta: null });
const companyPulse = ref({
  revenueMtd: 0,
  outstandingAr: 0,
  approvalPendingTotal: 0,
});
const saldoKas = ref({
  Cabang: null as string | null,
  Saldo: 0,
  JumlahRekening: 0,
});
const showCompanyPulse = computed(
  () => isSuperViewer.value || bagian.value === "FINANCE",
);
const showSaldoKas = computed(
  () => ["FINANCE", "PEMBELIAN"].includes(bagian.value) || isSuperViewer.value,
);
// const realisasiRows = ref<any[]>([]);
interface RealisasiBulananStatus {
  JmlItem: number;
  Nilai: number;
}
interface RealisasiBulananMonth {
  Bulan: string;
  statuses: Record<string, RealisasiBulananStatus>;
  totalItem: number;
  totalNilai: number;
}
interface RealisasiBulananDivisi {
  divisi: string;
  bulanan: RealisasiBulananMonth[];
}
const realisasiBulananData = ref<RealisasiBulananDivisi[]>([]);
interface StatusKirimMapBucket {
  Bulan: string;
  JumlahMAP: number;
  real: number[]; // [0-7, 8-14, 15-30, >30]
  belum: number[];
}
interface StatusKirimMapDivisi {
  divisi: string;
  bulanan: StatusKirimMapBucket[];
}
const statusKirimMapData = ref<StatusKirimMapDivisi[]>([]);
interface SlowDeadStockItem {
  Kode: string;
  Nama: string;
  Satuan: string;
  Stok: number;
  UmurHari: number;
  Status: string;
}
interface SlowDeadStockJenis {
  jenisKode: string;
  jenisNama: string;
  totalStokList: { satuan: string; stok: number }[];
  jmlSlowmoving: number;
  jmlDeadStock: number;
  items: SlowDeadStockItem[];
}
const slowDeadStockData = ref<SlowDeadStockJenis[]>([]);
const SLOW_DEAD_PAGE_SIZE = 15;
const slowDeadStockPage = ref(1);
const slowDeadStockTotalPages = computed(() =>
  Math.max(1, Math.ceil(slowDeadStockData.value.length / SLOW_DEAD_PAGE_SIZE)),
);
const slowDeadStockPaged = computed(() => {
  const start = (slowDeadStockPage.value - 1) * SLOW_DEAD_PAGE_SIZE;
  return slowDeadStockData.value.slice(start, start + SLOW_DEAD_PAGE_SIZE);
});
interface KonversiBabaranItem {
  kategori: string;
  label: string;
  totalPcs: number;
  totalKg: number;
  pcsPerKg: number;
}
const konversiBabaranData = ref<KonversiBabaranItem[]>([]);

const poBpbSummary = ref({ TotalPO: 0, Open: 0, OnProses: 0, Close: 0 });
const isLoadingDashboard = ref(false);
const marketingLoaded = ref(false);
const financeLoaded = ref(false);
const gudangLoaded = ref(false);
const gudangBahanLoaded = ref(false);
const barangJadiLoaded = ref(false);
const kunjunganRows = ref<any[]>([]);
interface EffectiveCallingRow {
  NamaCustomer: string;
  NomorPenawaran: string;
  QtyPenawaran: number;
  NilaiPenawaran: number;
  JmlMap: number;
  NilaiMap: number;
  MapNomorList: string | null;
  JmlSo: number;
  NilaiSo: number;
  SoNomorList: string | null;
}
const showEffectiveCallingDialog = ref(false);
const effectiveCallingNama = ref("");
const isLoadingEffectiveCalling = ref(false);
const effectiveCallingList = ref<EffectiveCallingRow[]>([]);

const openEffectiveCalling = async (namaSales: string) => {
  effectiveCallingNama.value = namaSales;
  showEffectiveCallingDialog.value = true;
  isLoadingEffectiveCalling.value = true;
  effectiveCallingList.value = [];
  try {
    const res = await dashboardService.getEffectiveCallingDetail(namaSales);
    effectiveCallingList.value = res.data.data || [];
  } catch {
    /* silent */
  } finally {
    isLoadingEffectiveCalling.value = false;
  }
};
const gudangBahanData = ref<GudangBahanData>({
  metric: { TotalJenis: 0, JmlBawahBuffer: 0, TotalBarcode: 0, JmlMinus: 0 },
  detailBawahBuffer: [],
  topStok: [],
  bahanBarcode: [],
});
const isLoadingGudangBahan = ref(false);
const realisasiPenawaranData = ref<RealisasiData>({
  metric: {
    TotalPenawaran: 0,
    KonversiCepat: 0,
    KonversiNormal: 0,
    KonversiLambat: 0,
    KonversiSangatLambat: 0,
    BelumKonversi: 0,
    Batal: 0,
    RataRataHari: 0,
  },
  tren: [],
  distribusi: [],
  tabelDetail: [],
});
interface KategoriKonversi {
  kode: string;
  JmlItem: number;
  Nilai: number;
  Pct: number;
}
interface KategoriKonversiData {
  totalItem: number;
  totalNilai: number;
  totalQty: number;
  kategori: KategoriKonversi[];
}
const realisasiPenToMap = ref<KategoriKonversiData>({
  totalItem: 0,
  totalNilai: 0,
  totalQty: 0,
  kategori: [],
});
const realisasiMapToSo = ref<KategoriKonversiData>({
  totalItem: 0,
  totalNilai: 0,
  totalQty: 0,
  kategori: [],
});
const piutangData = ref<PiutangData>({
  summary: {
    TotalDebet: 0,
    TotalKredit: 0,
    TotalOutstanding: 0,
    InvoiceBulanIni: 0,
    TerimaBulanIni: 0,
    overdueTotal: 0,
  },
  top5: [],
  overdue: [],
  trend: [],
});
const targetCollectionData = ref<TargetCollectionData | null>(null);
const isLoadingTargetCollection = ref(false);
const targetCollectionCache = new Map<string, TargetCollectionData>();
const targetCollectionMonthChips = computed(() => {
  const arr: { bulan: number; tahun: number; label: string; key: string }[] =
    [];
  const now = new Date();
  const tahun = now.getFullYear();
  const bulanSekarang = now.getMonth() + 1;
  for (let m = 1; m <= bulanSekarang; m++) {
    arr.push({
      bulan: m,
      tahun,
      label: `${BULAN_LABEL[m - 1]} '${String(tahun).slice(2)}`,
      key: `${tahun}-${m}`,
    });
  }
  return arr;
});

const selectedTargetCollectionKey = computed(() =>
  targetCollectionData.value
    ? `${targetCollectionData.value.tahun}-${targetCollectionData.value.bulan}`
    : "",
);

const fetchTargetCollection = async (bulan: number, tahun: number) => {
  const key = `${tahun}-${bulan}`;
  const cached = targetCollectionCache.get(key);
  if (cached) {
    targetCollectionData.value = cached;
    return;
  }
  isLoadingTargetCollection.value = true;
  try {
    const res = await dashboardService.getTargetCollectionSales(bulan, tahun);
    const data: TargetCollectionData = res.data.data;
    targetCollectionCache.set(key, data);
    targetCollectionData.value = data;
  } catch {
    /* silent */
  } finally {
    isLoadingTargetCollection.value = false;
  }
};

const ensureTargetCollectionLoaded = async () => {
  if (targetCollectionData.value) return;
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const key = `${tahun}-${bulan}`;
  isLoadingTargetCollection.value = !hasSnapshot(`tc:${key}`);
  try {
    await snap(
      `tc:${key}`,
      () => payload(dashboardService.getTargetCollectionSales(bulan, tahun)),
      (d: TargetCollectionData) => {
        targetCollectionCache.set(key, d);
        targetCollectionData.value = d;
      },
    );
  } finally {
    isLoadingTargetCollection.value = false;
  }
};
const aktivitasList = ref<any[]>([]);
const trendData = ref<any[]>([]);
const trendChartEl = ref<HTMLElement | null>(null);
const stokAccVsMkaCount = ref(0);
const stokBebasSummary = ref({ total: 0 });
const SB_PAGE_SIZE = 20;
const stokBebasList = ref<StokBebasItem[]>([]);
const sbOffset = ref(0);
const sbHasMore = ref(true);
const isLoadingMoreSb = ref(false);
const sbSentinelEl = ref<HTMLElement | null>(null);
let sbScrollObserver: IntersectionObserver | null = null;
const bufferKaosanSummary = ref({ total: 0 });
const BK_PAGE_SIZE = 20;
const bufferKaosanList = ref<BufferKaosanItem[]>([]);
const bkOffset = ref(0);
const bkHasMore = ref(true);
const isLoadingMoreBk = ref(false);
const bkSentinelEl = ref<HTMLElement | null>(null);
let bkScrollObserver: IntersectionObserver | null = null;

// ── State Penerimaan ──
const penerimaanSummary = ref({
  TotalPenerimaanBulanIni: 0,
  JmlTransaksiBulanIni: 0,
  SaldoBelumAplikasi: 0,
});

// Coverage rate: penerimaan bulan ini vs invoice bulan ini
const coverageRate = computed(() => {
  const invoice = piutangData.value.summary.InvoiceBulanIni || 0;
  const penerima = penerimaanSummary.value.TotalPenerimaanBulanIni || 0;
  if (!invoice) return 0;
  return Math.round((penerima / invoice) * 100);
});

const coverageRateColor = computed(() => {
  if (coverageRate.value >= 100) return C.good;
  if (coverageRate.value >= 70) return C.warn;
  return C.bad;
});

// --- Gudang Garmen ---
const pipelineData = ref<PipelineData>({
  TotalMasuk: 0,
  AdaMkb: 0,
  AdaRealisasi: 0,
  AdaLhk: 0,
  AdaStbj: 0,
  AdaKirim: 0,
});
const bahanKurangSummary = ref({ total: 0 });
const spkBelumMkbCountVal = ref(0);
const poJasaVsBpjData = ref<PoJasaVsBpjData>({
  TotalPO: 0,
  Belum: 0,
  Proses: 0,
  Closed: 0,
});
const outstandingPoMitraSummary = ref({ totalMitra: 0, totalKurang: 0 });
const efisiensiBabaranSummary = ref({
  totalSpk: 0,
  jmlDeviasi: 0,
  pctDeviasi: 0,
});

// Filter periode pipeline — default bulan berjalan (spk_dateline)
const pipelineFilter = ref({
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .substring(0, 10),
  endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    .toISOString()
    .substring(0, 10),
});

const fetchPipelineData = async () => {
  try {
    const res = await dashboardService.getPipelineSpkProduksi(
      pipelineFilter.value.startDate,
      pipelineFilter.value.endDate,
    );
    if (res.data?.data) pipelineData.value = res.data.data;
  } catch {
    /* silent */
  }
};

// ── Pipeline Penyelesaian SPK (SPK -> STBJ -> Kirim -> Invoice) ──
const pipelinePenyelesaianSpk = ref<PipelinePenyelesaianSpk>({
  TotalAktif: 0,
  SudahStbj: 0,
  SudahKirim: 0,
  FullInvoice: 0,
});

const flowReady = ref(false);
const productionFlowStages = computed(() => [
  { key: "spk", label: "SPK masuk", value: pipelineData.value.TotalMasuk },
  { key: "mkb", label: "MKB", value: pipelineData.value.AdaMkb },
  {
    key: "realisasi",
    label: "Realisasi minta",
    value: pipelineData.value.AdaRealisasi,
  },
  { key: "lhk", label: "LHK cutting", value: pipelineData.value.AdaLhk },
  { key: "stbj", label: "STBJ", value: pipelineData.value.AdaStbj },
  { key: "kirim", label: "Kirim (SJ)", value: pipelineData.value.AdaKirim },
  {
    key: "invoice",
    label: "Invoice penuh",
    value: pipelinePenyelesaianSpk.value.FullInvoice,
  },
]);

const fetchPipelinePenyelesaianSpk = async () => {
  try {
    const res = await dashboardService.getPipelinePenyelesaianSpk(
      pipelineFilter.value.startDate,
      pipelineFilter.value.endDate,
    );
    if (res.data?.data) pipelinePenyelesaianSpk.value = res.data.data;
  } catch {
    /* silent */
  }
};

// ── SPK vs STBJ ──
const spkVsStbjSummary = ref<SpkVsStbjSummary>({
  TotalAktif: 0,
  SudahStbj: 0,
  BelumStbj: 0,
  RataRataHari: null,
});

const SPK_STBJ_PAGE_SIZE = 20;
const spkBelumStbjList = ref<SpkBelumStbjItem[]>([]);
const spkStbjOffset = ref(0);
const spkStbjHasMore = ref(true);
const isLoadingMoreSpkStbj = ref(false);
const spkStbjSentinelEl = ref<HTMLElement | null>(null);
let spkStbjScrollObserver: IntersectionObserver | null = null;

const loadMoreSpkStbj = async () => {
  if (!spkStbjHasMore.value || isLoadingMoreSpkStbj.value) return;
  isLoadingMoreSpkStbj.value = true;
  try {
    loadFailed.SpkStbj = false;
    const res = await dashboardService.getSpkVsStbjList(
      SPK_STBJ_PAGE_SIZE,
      spkStbjOffset.value,
      pipelineFilter.value.startDate,
      pipelineFilter.value.endDate,
    );
    const rows: SpkBelumStbjItem[] = res.data.data;
    spkBelumStbjList.value.push(...rows);
    spkStbjOffset.value += rows.length;
    if (rows.length < SPK_STBJ_PAGE_SIZE) spkStbjHasMore.value = false;
  } catch {
    loadFailed.SpkStbj = true;
  } finally {
    isLoadingMoreSpkStbj.value = false;
  }
};

const setupSpkStbjObserver = () => {
  if (spkStbjScrollObserver) spkStbjScrollObserver.disconnect();
  if (!spkStbjSentinelEl.value) return;
  spkStbjScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreSpkStbj();
    },
    { threshold: 0.1 },
  );
  spkStbjScrollObserver.observe(spkStbjSentinelEl.value);
};

// ── SPK vs SJ ──
const spkVsSjSummary = ref<SpkVsSjSummary>({
  TotalAktif: 0,
  BelumKirim: 0,
  SebagianKirim: 0,
  LunasKirim: 0,
  TotalQtyOrder: 0,
  TotalQtyKirim: 0,
});
const spkKirimRate = computed(() => {
  if (!spkVsSjSummary.value.TotalQtyOrder) return 0;
  return Math.round(
    (spkVsSjSummary.value.TotalQtyKirim / spkVsSjSummary.value.TotalQtyOrder) *
      100,
  );
});

const SPK_SJ_PAGE_SIZE = 20;
const spkBelumKirimList = ref<SpkBelumKirimItem[]>([]);
const spkSjOffset = ref(0);
const spkSjHasMore = ref(true);
const isLoadingMoreSpkSj = ref(false);
const spkSjSentinelEl = ref<HTMLElement | null>(null);
let spkSjScrollObserver: IntersectionObserver | null = null;

const loadMoreSpkSj = async () => {
  if (!spkSjHasMore.value || isLoadingMoreSpkSj.value) return;
  isLoadingMoreSpkSj.value = true;
  try {
    loadFailed.SpkSj = false;
    const res = await dashboardService.getSpkVsSjList(
      SPK_SJ_PAGE_SIZE,
      spkSjOffset.value,
      pipelineFilter.value.startDate,
      pipelineFilter.value.endDate,
    );
    const rows: SpkBelumKirimItem[] = res.data.data;
    spkBelumKirimList.value.push(...rows);
    spkSjOffset.value += rows.length;
    if (rows.length < SPK_SJ_PAGE_SIZE) spkSjHasMore.value = false;
  } catch {
    loadFailed.SpkSj = true;
  } finally {
    isLoadingMoreSpkSj.value = false;
  }
};

const setupSpkSjObserver = () => {
  if (spkSjScrollObserver) spkSjScrollObserver.disconnect();
  if (!spkSjSentinelEl.value) return;
  spkSjScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreSpkSj();
    },
    { threshold: 0.1 },
  );
  spkSjScrollObserver.observe(spkSjSentinelEl.value);
};

// ── SPK Terkirim Belum Ditagih (Finance) ──
const spkBelumTagihSummary = ref<SpkBelumTagihSummary>({
  TotalTerkirim: 0,
  BelumInvoice: 0,
  SebagianInvoice: 0,
  FullInvoice: 0,
  TotalQtyBelumDitagih: 0,
});
const spkTagihFilter = ref({
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .substring(0, 10),
  endDate: new Date().toISOString().substring(0, 10),
});

const SPK_TAGIH_PAGE_SIZE = 20;
const spkBelumTagihList = ref<SpkBelumTagihItem[]>([]);
const spkTagihOffset = ref(0);
const spkTagihHasMore = ref(true);
const isLoadingMoreSpkTagih = ref(false);
const spkTagihSentinelEl = ref<HTMLElement | null>(null);
let spkTagihScrollObserver: IntersectionObserver | null = null;

const loadMoreSpkTagih = async () => {
  if (!spkTagihHasMore.value || isLoadingMoreSpkTagih.value) return;
  isLoadingMoreSpkTagih.value = true;
  try {
    loadFailed.SpkTagih = false;
    const res = await dashboardService.getSpkTerkirimBelumTagihList(
      SPK_TAGIH_PAGE_SIZE,
      spkTagihOffset.value,
      spkTagihFilter.value.startDate,
      spkTagihFilter.value.endDate,
    );
    const rows: SpkBelumTagihItem[] = res.data.data;
    spkBelumTagihList.value.push(...rows);
    spkTagihOffset.value += rows.length;
    if (rows.length < SPK_TAGIH_PAGE_SIZE) spkTagihHasMore.value = false;
  } catch {
    loadFailed.SpkTagih = true;
  } finally {
    isLoadingMoreSpkTagih.value = false;
  }
};

const setupSpkTagihObserver = () => {
  if (spkTagihScrollObserver) spkTagihScrollObserver.disconnect();
  if (!spkTagihSentinelEl.value) return;
  spkTagihScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreSpkTagih();
    },
    { threshold: 0.1 },
  );
  spkTagihScrollObserver.observe(spkTagihSentinelEl.value);
};

// --- Barang Jadi ---
const barangJadiMetric = ref<BarangJadiMetric>({
  TotalItem: 0,
  TotalStok: 0,
  ItemBergerak: 0,
  ItemMinus: 0,
});

const gudangJadiOptions = [
  { value: "", label: "Semua Gudang" },
  { value: "GJ002", label: "Gudang Barang Jadi P1" },
  { value: "GJ001", label: "Gudang Barang Jadi Jeron (P04)" },
];
const stokBjGudangFilter = ref("");

// ── Infinite scroll: Stok Barang Jadi ──
const STOK_BJ_PAGE_SIZE = 20;
const stokBarangJadiList = ref<StokBarangJadiItem[]>([]);
const stokBjOffset = ref(0);
const stokBjHasMore = ref(true);
const isLoadingMoreStokBj = ref(false);
const stokBjSentinelEl = ref<HTMLElement | null>(null);
let stokBjScrollObserver: IntersectionObserver | null = null;

const loadMoreStokBj = async () => {
  if (!stokBjHasMore.value || isLoadingMoreStokBj.value) return;
  isLoadingMoreStokBj.value = true;
  try {
    loadFailed.StokBj = false;
    const res = await dashboardService.getStokBarangJadiList(
      STOK_BJ_PAGE_SIZE,
      stokBjOffset.value,
      stokBjGudangFilter.value,
    );
    const rows: StokBarangJadiItem[] = res.data.data;
    stokBarangJadiList.value.push(...rows);
    stokBjOffset.value += rows.length;
    if (rows.length < STOK_BJ_PAGE_SIZE) stokBjHasMore.value = false;
  } catch {
    loadFailed.StokBj = true;
  } finally {
    isLoadingMoreStokBj.value = false;
  }
};

const onChangeStokBjGudang = async () => {
  stokBarangJadiList.value = [];
  stokBjOffset.value = 0;
  stokBjHasMore.value = true;
  await loadMoreStokBj();
};

const setupStokBjObserver = () => {
  if (stokBjScrollObserver) stokBjScrollObserver.disconnect();
  if (!stokBjSentinelEl.value) return;
  stokBjScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreStokBj();
    },
    { threshold: 0.1 },
  );
  stokBjScrollObserver.observe(stokBjSentinelEl.value);
};

// ── Infinite scroll: Mutasi Barang Jadi ──
const MUTASI_BJ_PAGE_SIZE = 20;
const mutasiBarangJadiList = ref<MutasiBarangJadiItem[]>([]);
const mutasiBjOffset = ref(0);
const mutasiBjHasMore = ref(true);
const isLoadingMoreMutasiBj = ref(false);
const mutasiBjSentinelEl = ref<HTMLElement | null>(null);
let mutasiBjScrollObserver: IntersectionObserver | null = null;

const loadMoreMutasiBj = async () => {
  if (!mutasiBjHasMore.value || isLoadingMoreMutasiBj.value) return;
  isLoadingMoreMutasiBj.value = true;
  try {
    loadFailed.MutasiBj = false;
    const res = await dashboardService.getMutasiBarangJadiList(
      MUTASI_BJ_PAGE_SIZE,
      mutasiBjOffset.value,
    );
    const rows: MutasiBarangJadiItem[] = res.data.data;
    mutasiBarangJadiList.value.push(...rows);
    mutasiBjOffset.value += rows.length;
    if (rows.length < MUTASI_BJ_PAGE_SIZE) mutasiBjHasMore.value = false;
  } catch {
    loadFailed.MutasiBj = true;
  } finally {
    isLoadingMoreMutasiBj.value = false;
  }
};

const setupMutasiBjObserver = () => {
  if (mutasiBjScrollObserver) mutasiBjScrollObserver.disconnect();
  if (!mutasiBjSentinelEl.value) return;
  mutasiBjScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreMutasiBj();
    },
    { threshold: 0.1 },
  );
  mutasiBjScrollObserver.observe(mutasiBjSentinelEl.value);
};

const isLoadingBarangJadi = ref(false);

// ── Infinite scroll: Penawaran Belum SPK ──
const PEN_PAGE_SIZE = 20;
const penOffset = ref(0);
const penHasMore = ref(true);
const isLoadingMorePen = ref(false);
const penSentinelEl = ref<HTMLElement | null>(null);
let penScrollObserver: IntersectionObserver | null = null;

const loadMorePenawaran = async () => {
  if (!penHasMore.value || isLoadingMorePen.value) return;
  isLoadingMorePen.value = true;
  try {
    loadFailed.Pen = false;
    const res = await dashboardService.getPenawaranBelumSpk(
      PEN_PAGE_SIZE,
      penOffset.value,
    );
    const rows: any[] = res.data.data;
    penawaranBelumSpk.value.push(...rows);
    penOffset.value += rows.length;
    if (rows.length < PEN_PAGE_SIZE) penHasMore.value = false;
  } catch {
    loadFailed.Pen = true;
  } finally {
    isLoadingMorePen.value = false;
  }
};

const setupPenObserver = () => {
  if (penScrollObserver) penScrollObserver.disconnect();
  if (!penSentinelEl.value) return;
  penScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePenawaran();
    },
    { threshold: 0.1 },
  );
  penScrollObserver.observe(penSentinelEl.value);
};

// ── Infinite scroll: Penawaran Belum MAP ──
const MAP_PAGE_SIZE = 20;
const mapOffset = ref(0);
const mapHasMore = ref(true);
const isLoadingMoreMap = ref(false);
const mapSentinelEl = ref<HTMLElement | null>(null);
let mapScrollObserver: IntersectionObserver | null = null;

const loadMoreMap = async () => {
  if (!mapHasMore.value || isLoadingMoreMap.value) return;
  isLoadingMoreMap.value = true;
  try {
    loadFailed.Map = false;
    const res = await dashboardService.getPenawaranBelumMap(
      MAP_PAGE_SIZE,
      mapOffset.value,
    );
    const rows: any[] = res.data.data;
    penawaranBelumMap.value.push(...rows);
    mapOffset.value += rows.length;
    if (rows.length < MAP_PAGE_SIZE) mapHasMore.value = false;
  } catch {
    loadFailed.Map = true;
  } finally {
    isLoadingMoreMap.value = false;
  }
};

const setupMapObserver = () => {
  if (mapScrollObserver) mapScrollObserver.disconnect();
  if (!mapSentinelEl.value) return;
  mapScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreMap();
    },
    { threshold: 0.1 },
  );
  mapScrollObserver.observe(mapSentinelEl.value);
};

interface PenawaranBatalItem {
  Nomor: string;
  Tanggal: string;
  NamaCustomer: string;
  Divisi: string;
  NamaBarang: string;
  Nilai: number;
  AlasanBatal: string;
  UmurHari: number;
}
const penawaranBatalSummary = ref({ total: 0 });
const PB_PAGE_SIZE = 20;
const penawaranBatalList = ref<PenawaranBatalItem[]>([]);
const pbBatalOffset = ref(0);
const pbBatalHasMore = ref(true);
const isLoadingMorePbBatal = ref(false);
const pbBatalSentinelEl = ref<HTMLElement | null>(null);
let pbBatalScrollObserver: IntersectionObserver | null = null;

const loadMorePbBatal = async () => {
  if (!pbBatalHasMore.value || isLoadingMorePbBatal.value) return;
  isLoadingMorePbBatal.value = true;
  try {
    loadFailed.PbBatal = false;
    const res = await dashboardService.getPenawaranBatalList(
      PB_PAGE_SIZE,
      pbBatalOffset.value,
    );
    const rows: PenawaranBatalItem[] = res.data.data;
    penawaranBatalList.value.push(...rows);
    pbBatalOffset.value += rows.length;
    if (rows.length < PB_PAGE_SIZE) pbBatalHasMore.value = false;
  } catch {
    loadFailed.PbBatal = true;
  } finally {
    isLoadingMorePbBatal.value = false;
  }
};

const setupPbBatalObserver = () => {
  if (pbBatalScrollObserver) pbBatalScrollObserver.disconnect();
  if (!pbBatalSentinelEl.value) return;
  pbBatalScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePbBatal();
    },
    { threshold: 0.1 },
  );
  pbBatalScrollObserver.observe(pbBatalSentinelEl.value);
};

// ── Infinite scroll: Invoice Overdue ──
const OVERDUE_PAGE_SIZE = 20;
const overdueList = ref<OverdueItem[]>([]);
const overdueOffset = ref(0);
const overdueHasMore = ref(true);
const isLoadingMoreOverdue = ref(false);
const overdueSentinelEl = ref<HTMLElement | null>(null);
let overdueScrollObserver: IntersectionObserver | null = null;

const loadMoreOverdue = async () => {
  if (!overdueHasMore.value || isLoadingMoreOverdue.value) return;
  isLoadingMoreOverdue.value = true;
  try {
    loadFailed.Overdue = false;
    const res = await dashboardService.getPiutangOverdue(
      OVERDUE_PAGE_SIZE,
      overdueOffset.value,
    );
    const rows: OverdueItem[] = res.data.data;
    overdueList.value.push(...rows);
    overdueOffset.value += rows.length;
    if (rows.length < OVERDUE_PAGE_SIZE) overdueHasMore.value = false;
  } catch {
    loadFailed.Overdue = true;
  } finally {
    isLoadingMoreOverdue.value = false;
  }
};

const setupOverdueObserver = () => {
  if (overdueScrollObserver) overdueScrollObserver.disconnect();
  overdueScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreOverdue();
    },
    { threshold: 0.1 },
  );
  if (overdueSentinelEl.value)
    overdueScrollObserver.observe(overdueSentinelEl.value);
};

// ── Infinite scroll: Bahan Penolong Bawah Buffer ──
const BUFFER_PAGE_SIZE = 20;
const bufferList = ref<BufferItem[]>([]);
const bufferOffset = ref(0);
const bufferHasMore = ref(true);
const isLoadingMoreBuffer = ref(false);
const bufferSentinelEl = ref<HTMLElement | null>(null);
let bufferScrollObserver: IntersectionObserver | null = null;

const loadMoreBuffer = async () => {
  if (!bufferHasMore.value || isLoadingMoreBuffer.value) return;
  isLoadingMoreBuffer.value = true;
  try {
    loadFailed.Buffer = false;
    const res = await dashboardService.getGudangBahanBuffer(
      BUFFER_PAGE_SIZE,
      bufferOffset.value,
    );
    const rows: BufferItem[] = res.data.data;
    bufferList.value.push(...rows);
    bufferOffset.value += rows.length;
    if (rows.length < BUFFER_PAGE_SIZE) bufferHasMore.value = false;
  } catch {
    loadFailed.Buffer = true;
  } finally {
    isLoadingMoreBuffer.value = false;
  }
};

const setupBufferObserver = () => {
  if (bufferScrollObserver) bufferScrollObserver.disconnect();
  if (!bufferSentinelEl.value) return;
  bufferScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreBuffer();
    },
    { threshold: 0.1 },
  );
  bufferScrollObserver.observe(bufferSentinelEl.value);
};

// ── Infinite scroll: Stok Bahan Utama (Barcode) ──
const BAHAN_PAGE_SIZE = 20;
const bahanList = ref<BahanBarcodeItem[]>([]);
const bahanOffset = ref(0);
const bahanHasMore = ref(true);
const isLoadingMoreBahan = ref(false);
const bahanSentinelEl = ref<HTMLElement | null>(null);
let bahanScrollObserver: IntersectionObserver | null = null;

const loadMoreBahan = async () => {
  if (!bahanHasMore.value || isLoadingMoreBahan.value) return;
  isLoadingMoreBahan.value = true;
  try {
    loadFailed.Bahan = false;
    const res = await dashboardService.getGudangBahanBarcode(
      BAHAN_PAGE_SIZE,
      bahanOffset.value,
    );
    const rows: BahanBarcodeItem[] = res.data.data;
    bahanList.value.push(...rows);
    bahanOffset.value += rows.length;
    if (rows.length < BAHAN_PAGE_SIZE) bahanHasMore.value = false;
  } catch {
    loadFailed.Bahan = true;
  } finally {
    isLoadingMoreBahan.value = false;
  }
};

const setupBahanObserver = () => {
  if (bahanScrollObserver) bahanScrollObserver.disconnect();
  if (!bahanSentinelEl.value) return;
  bahanScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreBahan();
    },
    { threshold: 0.1 },
  );
  bahanScrollObserver.observe(bahanSentinelEl.value);
};

// ── Infinite scroll: Realisasi Penawaran Detail ──
interface RealisasiDetailItem {
  NomorPenawaran: string;
  TglPenawaran: string;
  Customer: string;
  TotalSPK: number;
  SpkPertama: string | null;
  TglSpkPertama: string | null;
  HariKonversi: number | null;
  IsBatal: number;
}

const RP_DETAIL_PAGE_SIZE = 20;
const rpDetailList = ref<RealisasiDetailItem[]>([]);
const rpDetailOffset = ref(0);
const rpDetailHasMore = ref(true);
const isLoadingMoreRpDetail = ref(false);
const rpDetailSentinelEl = ref<HTMLElement | null>(null);
let rpDetailScrollObserver: IntersectionObserver | null = null;

const loadMoreRpDetail = async () => {
  if (!rpDetailHasMore.value || isLoadingMoreRpDetail.value) return;
  isLoadingMoreRpDetail.value = true;
  try {
    loadFailed.RpDetail = false;
    const res = await dashboardService.getRealisasiPenawaranDetail(
      RP_DETAIL_PAGE_SIZE,
      rpDetailOffset.value,
    );
    const rows: RealisasiDetailItem[] = res.data.data;
    rpDetailList.value.push(...rows);
    rpDetailOffset.value += rows.length;
    if (rows.length < RP_DETAIL_PAGE_SIZE) rpDetailHasMore.value = false;
  } catch {
    loadFailed.RpDetail = true;
  } finally {
    isLoadingMoreRpDetail.value = false;
  }
};

const setupRpDetailObserver = () => {
  if (rpDetailScrollObserver) rpDetailScrollObserver.disconnect();
  if (!rpDetailSentinelEl.value) return;
  rpDetailScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreRpDetail();
    },
    { threshold: 0.1 },
  );
  rpDetailScrollObserver.observe(rpDetailSentinelEl.value);
};

// ── Range tetap 90 hari untuk panel MAP/Proyeksi (filter periode dihapus) ──
const mapRangeEnd = new Date().toISOString().substring(0, 10);
const mapRangeStart = new Date(Date.now() - 89 * 86400000)
  .toISOString()
  .substring(0, 10);

// ── State MAP vs SPK ──
interface MapVsSpkMetric {
  TotalMAP: number;
  SudahSO: number;
  BelumSO: number;
  TotalNilai: number;
  NilaiSudahSO: number;
  NilaiBelumSO: number;
}
interface MapDivisiItem {
  Divisi: string;
  TotalMAP: number;
  SudahSO: number;
  NilaiSO: number;
  NilaiPotensi: number;
}
interface MapBelumSpkItem {
  Nomor: string;
  Tanggal: string;
  Divisi: string;
  NamaCustomer: string;
  NamaMAP: string;
  Jumlah: number;
  NilaiPotensi: number;
  UmurHari: number;
}
const mapSpkMetric = ref<MapVsSpkMetric>({
  TotalMAP: 0,
  SudahSO: 0,
  BelumSO: 0,
  TotalNilai: 0,
  NilaiSudahSO: 0,
  NilaiBelumSO: 0,
});
const mapDivisi = ref<MapDivisiItem[]>([]);

// ── State MAP vs SJ ──
interface MapVsSjMetric {
  TotalMAP: number;
  BelumKirim: number;
  SebagianKirim: number;
  LunasKirim: number;
  TotalQtyOrder: number;
  TotalQtyKirim: number;
}
interface MapBelumKirimItem {
  Nomor: string;
  Tanggal: string;
  Divisi: string;
  NamaCustomer: string;
  NamaMAP: string;
  QtyOrder: number;
  QtyKirim: number;
  Dateline: string;
}
const mapSjMetric = ref<MapVsSjMetric>({
  TotalMAP: 0,
  BelumKirim: 0,
  SebagianKirim: 0,
  LunasKirim: 0,
  TotalQtyOrder: 0,
  TotalQtyKirim: 0,
});

// ── Infinite scroll: MAP belum SPK ──
const MAP_SPK_PAGE_SIZE = 20;
const mapSpkList = ref<MapBelumSpkItem[]>([]);
const mapSpkOffset = ref(0);
const mapSpkHasMore = ref(true);
const isLoadingMoreMapSpk = ref(false);
const mapSpkSentinelEl = ref<HTMLElement | null>(null);
let mapSpkScrollObserver: IntersectionObserver | null = null;

const loadMoreMapSpk = async () => {
  if (!mapSpkHasMore.value || isLoadingMoreMapSpk.value) return;
  isLoadingMoreMapSpk.value = true;
  try {
    loadFailed.MapSpk = false;
    const res = await dashboardService.getMapBelumSpk(
      MAP_SPK_PAGE_SIZE,
      mapSpkOffset.value,
      mapRangeStart,
      mapRangeEnd,
    );
    const rows: MapBelumSpkItem[] = res.data.data;
    mapSpkList.value.push(...rows);
    mapSpkOffset.value += rows.length;
    if (rows.length < MAP_SPK_PAGE_SIZE) mapSpkHasMore.value = false;
  } catch {
    loadFailed.MapSpk = true;
  } finally {
    isLoadingMoreMapSpk.value = false;
  }
};

const setupMapSpkObserver = () => {
  if (mapSpkScrollObserver) mapSpkScrollObserver.disconnect();
  if (!mapSpkSentinelEl.value) return;
  mapSpkScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreMapSpk();
    },
    { threshold: 0.1 },
  );
  mapSpkScrollObserver.observe(mapSpkSentinelEl.value);
};

// ── Infinite scroll: MAP belum kirim ──
const MAP_KIRIM_PAGE_SIZE = 20;
const mapKirimList = ref<MapBelumKirimItem[]>([]);
const mapKirimOffset = ref(0);
const mapKirimHasMore = ref(true);
const isLoadingMoreMapKirim = ref(false);
const mapKirimSentinelEl = ref<HTMLElement | null>(null);
let mapKirimScrollObserver: IntersectionObserver | null = null;

const loadMoreMapKirim = async () => {
  if (!mapKirimHasMore.value || isLoadingMoreMapKirim.value) return;
  isLoadingMoreMapKirim.value = true;
  try {
    loadFailed.MapKirim = false;
    const res = await dashboardService.getMapBelumKirim(
      MAP_KIRIM_PAGE_SIZE,
      mapKirimOffset.value,
      mapRangeStart,
      mapRangeEnd,
    );
    const rows: MapBelumKirimItem[] = res.data.data;
    mapKirimList.value.push(...rows);
    mapKirimOffset.value += rows.length;
    if (rows.length < MAP_KIRIM_PAGE_SIZE) mapKirimHasMore.value = false;
  } catch {
    loadFailed.MapKirim = true;
  } finally {
    isLoadingMoreMapKirim.value = false;
  }
};

const setupMapKirimObserver = () => {
  if (mapKirimScrollObserver) mapKirimScrollObserver.disconnect();
  if (!mapKirimSentinelEl.value) return;
  mapKirimScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreMapKirim();
    },
    { threshold: 0.1 },
  );
  mapKirimScrollObserver.observe(mapKirimSentinelEl.value);
};

// ── State: Achievement Ringkas ──
interface AchievementByDivisi {
  Divisi: string;
  Target: number;
  Realisasi: number;
}
interface AchievementSales {
  SalNama: string;
  Target: number;
  Realisasi: number;
  Ach: number;
}
const achievementData = ref({
  totalTarget: 0,
  totalRealisasi: 0,
  totalAch: 0,
  byDivisi: [] as AchievementByDivisi[],
  topSales: [] as AchievementSales[],
  bottomSales: [] as AchievementSales[],
});

// ── State: Growth YoY ──
interface GrowthYoyRow {
  bulan: number;
  namaBulan: string;
  aktual: number;
  ly: number;
  yoy: number;
  runAktual: number;
  runYoy: number;
  runGrowthPersen: number;
  persenProyeksi: number;
}
const growthYoyData = ref<GrowthYoyRow[]>([]);
const growthYoyMonthlyOnly = computed(() =>
  growthYoyData.value.filter(
    (r) => Number(r.bulan) >= 1 && Number(r.bulan) <= 12,
  ),
);
// Bulan terbaru yang punya data growth valid (untuk indikator Growth vs Target)
const latestGrowthYoy = computed(() => {
  const rows = growthYoyMonthlyOnly.value.filter(
    (r) => r.ly !== null && r.ly !== undefined,
  );
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  return { ...last, yoy: calcYoyPct(last.aktual, last.ly) };
});

const growthVsTargetStatus = computed(() => {
  const growth = latestGrowthYoy.value;
  if (!growth || !achievementData.value.totalTarget) return null;
  const growing = Number(growth.yoy) >= 0;
  const onTarget = achievementData.value.totalAch >= 100;
  if (growing && onTarget)
    return { label: "Tumbuh & Capai Target", color: C.good, bg: C.goodSoft };
  if (growing && !onTarget)
    return {
      label: "Tumbuh, Target Belum Tercapai",
      color: C.warn,
      bg: C.warnSoft,
    };
  if (!growing && onTarget)
    return {
      label: "Target Tercapai, Growth Turun",
      color: C.warn,
      bg: C.warnSoft,
    };
  return {
    label: "Growth Turun & Target Belum Tercapai",
    color: C.bad,
    bg: C.badSoft,
  };
});

interface AchievementMonthlyRow {
  bulan: number;
  target: number;
  realisasi: number;
  ach: number;
}
const achievementMonthly = ref<AchievementMonthlyRow[]>([]);
const achMonthlyMap = computed(
  () => new Map(achievementMonthly.value.map((a) => [Number(a.bulan), a])),
);

interface GrowthYoyRowWithAch extends GrowthYoyRow {
  achInfo: AchievementMonthlyRow | null;
}

const growthYoyWithAch = computed<GrowthYoyRowWithAch[]>(() =>
  growthYoyData.value.map((row) => ({
    ...row,
    achInfo: achMonthlyMap.value.get(Number(row.bulan)) ?? null,
  })),
);

// ── Infinite scroll: Proyeksi vs Realisasi (gap customer) ──
interface GapCustomerItem {
  CusKode?: string;
  CusNama?: string;
  JoKode?: string;
  JoNama?: string;
  TotalMemo: number;
  RealisasiMemo: number | null;
  gap: number;
}
const PVR_PAGE_SIZE = 20;
const proyeksiVsRealisasiSummary = ref({
  totalMemo: 0,
  totalRealisasiMemo: 0,
  totalRealisasiAll: 0,
});
const gapCustomerList = ref<GapCustomerItem[]>([]);
const pvrPage = ref(1);
const pvrHasMore = ref(true);
const isLoadingMorePvr = ref(false);
const pvrSentinelEl = ref<HTMLElement | null>(null);
let pvrScrollObserver: IntersectionObserver | null = null;
const loadMorePvr = async () => {
  if (!pvrHasMore.value || isLoadingMorePvr.value) return;
  isLoadingMorePvr.value = true;
  try {
    loadFailed.Pvr = false;
    const res = await dashboardService.getProyeksiVsRealisasiSummary(
      mapRangeStart,
      mapRangeEnd,
      PVR_PAGE_SIZE,
      pvrPage.value,
    );
    const d = res.data.data;
    proyeksiVsRealisasiSummary.value = {
      totalMemo: d.totalMemo,
      totalRealisasiMemo: d.totalRealisasiMemo,
      totalRealisasiAll: d.totalRealisasiAll,
    };
    gapCustomerList.value.push(...(d.gapCustomer || []));
    pvrPage.value += 1;
    pvrHasMore.value = !!d.hasMore;
  } catch {
    loadFailed.Pvr = true;
  } finally {
    isLoadingMorePvr.value = false;
  }
};
const setupPvrObserver = () => {
  if (pvrScrollObserver) pvrScrollObserver.disconnect();
  if (!pvrSentinelEl.value) return;
  pvrScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePvr();
    },
    { threshold: 0.1 },
  );
  pvrScrollObserver.observe(pvrSentinelEl.value);
};

// ── Proyeksi Potensial (pengganti Proyeksi vs Realisasi) ──
interface PotensiSummary {
  jmlItem: number;
  totalPotensi: number;
  totalRealisasi: number;
  totalBatal: number;
}
interface PotensiItem {
  pot_nomor: string;
  pot_nama_item: string;
  pot_harga: number;
  pot_status: string;
  pot_alasan_batal: string | null;
  date_create: string;
  user_create: string;
  sal_nama: string | null;
  cus_nama: string | null;
  NomorSumber: string;
  Sumber: "PENAWARAN" | "MAP";
  IsRealisasi: number;
}
interface PotensiBatalItem {
  pot_nomor: string;
  pot_nama_item: string;
  pot_harga: number;
  pot_alasan_batal: string | null;
  date_create: string;
  TanggalBatal: string;
  user_create: string;
  user_modified: string;
  sal_nama: string | null;
  cus_nama: string | null;
  NomorSumber: string;
  Sumber: "PENAWARAN" | "MAP";
}
interface PotensiSourceOption {
  Sumber: "PENAWARAN" | "MAP";
  Nomor: string;
  PendId?: number | null; // ⬅ BARU — cuma terisi untuk PENAWARAN
  Tanggal: string;
  sal_nama: string | null;
  cus_nama: string;
  NamaItem: string;
  Nominal: number;
}

const potensiSummary = ref<PotensiSummary>({
  jmlItem: 0,
  totalPotensi: 0,
  totalRealisasi: 0,
  totalBatal: 0,
});

const POTENSI_PAGE_SIZE = 20;
const potensiList = ref<PotensiItem[]>([]);
const potensiOffset = ref(0);
const potensiHasMore = ref(true);
const isLoadingMorePotensi = ref(false);
const potensiSentinelEl = ref<HTMLElement | null>(null);
let potensiScrollObserver: IntersectionObserver | null = null;

const loadMorePotensiList = async () => {
  if (!potensiHasMore.value || isLoadingMorePotensi.value) return;
  isLoadingMorePotensi.value = true;
  try {
    loadFailed.Potensi = false;
    const res = await dashboardService.getPotensiList(
      POTENSI_PAGE_SIZE,
      potensiOffset.value,
    );
    const rows: PotensiItem[] = res.data.data.items ?? [];
    potensiList.value.push(...rows);
    potensiOffset.value += rows.length;
    if (rows.length < POTENSI_PAGE_SIZE) potensiHasMore.value = false;
  } catch {
    loadFailed.Potensi = true;
  } finally {
    isLoadingMorePotensi.value = false;
  }
};

const setupPotensiListObserver = () => {
  if (potensiScrollObserver) potensiScrollObserver.disconnect();
  if (!potensiSentinelEl.value) return;
  potensiScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePotensiList();
    },
    { threshold: 0.1 },
  );
  potensiScrollObserver.observe(potensiSentinelEl.value);
};

const fetchPotensiSummary = async () => {
  try {
    const res = await dashboardService.getPotensiSummary();
    if (res.data?.data) potensiSummary.value = res.data.data;
  } catch {
    /* silent */
  }
};

const isExportingPotensi = ref(false);
const exportPotensiExcel = async () => {
  isExportingPotensi.value = true;
  try {
    const all: PotensiItem[] = [];
    let offset = 0;
    const pageSize = 200;
    while (true) {
      const res = await dashboardService.getPotensiList(pageSize, offset);
      const rows: PotensiItem[] = res.data.data.items ?? [];
      all.push(...rows);
      offset += rows.length;
      if (rows.length < pageSize) break;
    }

    if (!all.length) {
      alert("Tidak ada data Proyeksi Potensial untuk diexport.");
      return;
    }

    const rows = all.map((item) => ({
      nomor: item.pot_nomor,
      tanggal: formatTanggalJam(item.date_create),
      sumber: item.Sumber,
      noSumber: item.NomorSumber,
      namaItem: item.pot_nama_item,
      customer: item.cus_nama || "-",
      sales: item.sal_nama || "-",
      userCreate: item.user_create,
      harga: Number(item.pot_harga) || 0,
      status: item.pot_status,
      alasanBatal: item.pot_alasan_batal || "",
    }));

    await exportExcelSingle(
      `Proyeksi_Potensial_${new Date().toISOString().substring(0, 10)}.xlsx`,
      "Proyeksi Potensial",
      [
        { header: "Nomor", key: "nomor", width: 16 },
        { header: "Tanggal", key: "tanggal", width: 14 },
        { header: "Sumber", key: "sumber", width: 12 },
        { header: "No. Sumber", key: "noSumber", width: 16 },
        { header: "Nama Item", key: "namaItem", width: 28 },
        { header: "Customer", key: "customer", width: 22 },
        { header: "Sales", key: "sales", width: 18 },
        { header: "User Create", key: "userCreate", width: 14 },
        {
          header: "Harga",
          key: "harga",
          width: 16,
          numFmt: '"Rp"#,##0',
          align: "right",
        },
        { header: "Status", key: "status", width: 14 },
        { header: "Alasan Batal", key: "alasanBatal", width: 24 },
      ],
      rows,
    );
  } catch (e: any) {
    console.error(e);
    alert("Gagal export Proyeksi Potensial: " + (e?.message ?? String(e)));
  } finally {
    isExportingPotensi.value = false;
  }
};

const PB2_PAGE_SIZE = 20;
const potensiBatalList = ref<PotensiBatalItem[]>([]);
const potensiBatalOffset = ref(0);
const potensiBatalHasMore = ref(true);
const isLoadingMorePotensiBatal = ref(false);
const potensiBatalSentinelEl = ref<HTMLElement | null>(null);
let potensiBatalScrollObserver: IntersectionObserver | null = null;

const loadMorePotensiBatalList = async () => {
  if (!potensiBatalHasMore.value || isLoadingMorePotensiBatal.value) return;
  isLoadingMorePotensiBatal.value = true;
  try {
    loadFailed.PotensiBatal = false;
    const res = await dashboardService.getPotensiBatalList(
      PB2_PAGE_SIZE,
      potensiBatalOffset.value,
    );
    const rows: PotensiBatalItem[] = res.data.data.items ?? [];
    potensiBatalList.value.push(...rows);
    potensiBatalOffset.value += rows.length;
    if (rows.length < PB2_PAGE_SIZE) potensiBatalHasMore.value = false;
  } catch {
    loadFailed.PotensiBatal = true;
  } finally {
    isLoadingMorePotensiBatal.value = false;
  }
};

const setupPotensiBatalListObserver = () => {
  if (potensiBatalScrollObserver) potensiBatalScrollObserver.disconnect();
  if (!potensiBatalSentinelEl.value) return;
  potensiBatalScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePotensiBatalList();
    },
    { threshold: 0.1 },
  );
  potensiBatalScrollObserver.observe(potensiBatalSentinelEl.value);
};

// ── Drill-down Target Collection ──
interface TargetDetailItem {
  jenis: "BARU" | "LAMA";
  nota: string;
  tanggal: string;
  cusKode: string;
  cusNama: string;
  debet: number;
  sisa: number;
  terbayar: number;
}

const showTargetDetailDialog = ref(false);
const isTargetDetailLoading = ref(false);
const targetDetailSalNama = ref("");
const targetDetailItems = ref<TargetDetailItem[]>([]);
const targetDetailLabel = ref("");

const openTargetDetail = async (row: {
  salKode: string;
  namaSales: string;
}) => {
  targetDetailSalNama.value = row.namaSales;
  showTargetDetailDialog.value = true;
  isTargetDetailLoading.value = true;
  targetDetailItems.value = [];
  try {
    const res = await dashboardService.getTargetCollectionDetail({
      salKode: row.salKode,
      bulan: targetCollectionData.value?.bulan,
      tahun: targetCollectionData.value?.tahun,
    });
    targetDetailItems.value = res.data.data?.items || [];
    targetDetailLabel.value = res.data.data?.targetBulanLabel || "";
  } catch (e: any) {
    alert(e?.response?.data?.message || "Gagal memuat detail invoice.");
  } finally {
    isTargetDetailLoading.value = false;
  }
};

const targetDetailTotal = computed(() =>
  targetDetailItems.value.reduce((sum, it) => sum + it.debet, 0),
);
const targetDetailSisaTotal = computed(() =>
  targetDetailItems.value.reduce((sum, it) => sum + it.sisa, 0),
);

// ── Dialog: Set Potensial (multi-select, 2 tab) ──
const showSetPotensiDialog = ref(false);
const potensiDialogTab = ref<"PENAWARAN" | "MAP">("PENAWARAN");
const potensiSourceCustFilter = ref("");

const PSRC_PAGE_SIZE = 20;

const penSourceList = ref<PotensiSourceOption[]>([]);
const penSourceOffset = ref(0);
const penSourceHasMore = ref(true);
const isLoadingMorePenSource = ref(false);
const penSourceSentinelEl = ref<HTMLElement | null>(null);
let penSourceScrollObserver: IntersectionObserver | null = null;

const mapSourceList = ref<PotensiSourceOption[]>([]);
const mapSourceOffset = ref(0);
const mapSourceHasMore = ref(true);
const isLoadingMoreMapSource = ref(false);
const mapSourceSentinelEl = ref<HTMLElement | null>(null);
let mapSourceScrollObserver: IntersectionObserver | null = null;

const selectedPotensiMap = ref(new Map<string, PotensiSourceOption>());
const selectedPotensiCount = computed(() => selectedPotensiMap.value.size);
const potensiKey = (opt: PotensiSourceOption) =>
  `${opt.Sumber}:${opt.Nomor}:${opt.PendId ?? ""}`;
const isPotensiSelected = (opt: PotensiSourceOption) =>
  selectedPotensiMap.value.has(potensiKey(opt));
const togglePotensiSelect = (opt: PotensiSourceOption) => {
  const key = potensiKey(opt);
  const next = new Map(selectedPotensiMap.value);
  if (next.has(key)) next.delete(key);
  else next.set(key, opt);
  selectedPotensiMap.value = next;
};

const loadMorePenSource = async () => {
  if (!penSourceHasMore.value || isLoadingMorePenSource.value) return;
  isLoadingMorePenSource.value = true;
  try {
    loadFailed.PenSource = false;
    const res = await dashboardService.getPotensiSourceOptions(
      potensiSourceCustFilter.value,
      "PENAWARAN",
      PSRC_PAGE_SIZE,
      penSourceOffset.value,
    );
    const rows: PotensiSourceOption[] = res.data.data.items ?? [];
    penSourceList.value.push(...rows);
    penSourceOffset.value += rows.length;
    if (rows.length < PSRC_PAGE_SIZE) penSourceHasMore.value = false;
  } catch {
    loadFailed.PenSource = true;
  } finally {
    isLoadingMorePenSource.value = false;
  }
};

const loadMoreMapSource = async () => {
  if (!mapSourceHasMore.value || isLoadingMoreMapSource.value) return;
  isLoadingMoreMapSource.value = true;
  try {
    loadFailed.MapSource = false;
    const res = await dashboardService.getPotensiSourceOptions(
      potensiSourceCustFilter.value,
      "MAP",
      PSRC_PAGE_SIZE,
      mapSourceOffset.value,
    );
    const rows: PotensiSourceOption[] = res.data.data.items ?? [];
    mapSourceList.value.push(...rows);
    mapSourceOffset.value += rows.length;
    if (rows.length < PSRC_PAGE_SIZE) mapSourceHasMore.value = false;
  } catch {
    loadFailed.MapSource = true;
  } finally {
    isLoadingMoreMapSource.value = false;
  }
};

const setupPenSourceObserver = () => {
  if (penSourceScrollObserver) penSourceScrollObserver.disconnect();
  if (!penSourceSentinelEl.value) return;
  penSourceScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePenSource();
    },
    { threshold: 0.1 },
  );
  penSourceScrollObserver.observe(penSourceSentinelEl.value);
};
const setupMapSourceObserver = () => {
  if (mapSourceScrollObserver) mapSourceScrollObserver.disconnect();
  if (!mapSourceSentinelEl.value) return;
  mapSourceScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreMapSource();
    },
    { threshold: 0.1 },
  );
  mapSourceScrollObserver.observe(mapSourceSentinelEl.value);
};

watch(potensiDialogTab, async (tab) => {
  if (tab === "MAP" && !mapSourceList.value.length && mapSourceHasMore.value) {
    await loadMoreMapSource();
  }
  await nextTick();
  if (tab === "PENAWARAN") setupPenSourceObserver();
  else setupMapSourceObserver();
});

watch(showSetPotensiDialog, (v) => {
  if (!v) {
    penSourceScrollObserver?.disconnect();
    mapSourceScrollObserver?.disconnect();
  }
});

const openSetPotensiDialog = async () => {
  showSetPotensiDialog.value = true;
  potensiDialogTab.value = "PENAWARAN";
  potensiSourceCustFilter.value = "";
  selectedPotensiMap.value = new Map();
  penSourceList.value = [];
  penSourceOffset.value = 0;
  penSourceHasMore.value = true;
  mapSourceList.value = [];
  mapSourceOffset.value = 0;
  mapSourceHasMore.value = true;
  await loadMorePenSource();
  await nextTick();
  setupPenSourceObserver();
};

const searchPotensiSource = async () => {
  penSourceList.value = [];
  penSourceOffset.value = 0;
  penSourceHasMore.value = true;
  mapSourceList.value = [];
  mapSourceOffset.value = 0;
  mapSourceHasMore.value = true;
  if (potensiDialogTab.value === "PENAWARAN") {
    await loadMorePenSource();
    await nextTick();
    setupPenSourceObserver();
  } else {
    await loadMoreMapSource();
    await nextTick();
    setupMapSourceObserver();
  }
};

const isSubmittingPotensi = ref(false);
const submitSetPotensi = async () => {
  if (selectedPotensiMap.value.size === 0) return;
  isSubmittingPotensi.value = true;
  try {
    const items = Array.from(selectedPotensiMap.value.values()).map((opt) => ({
      sumber: opt.Sumber,
      nomorSumber: opt.Nomor,
      pendId: opt.PendId ?? undefined, // ⬅ BARU
      namaItem: opt.NamaItem,
      harga: Number(opt.Nominal) || 0,
    }));
    await dashboardService.setPotensiBulk(items);
    showSetPotensiDialog.value = false;
    potensiList.value = [];
    potensiOffset.value = 0;
    potensiHasMore.value = true;
    potensiBatalList.value = [];
    potensiBatalOffset.value = 0;
    potensiBatalHasMore.value = true;
    await Promise.allSettled([
      fetchPotensiSummary(),
      loadMorePotensiList(),
      loadMorePotensiBatalList(),
    ]);
  } catch (e: any) {
    alert(e?.response?.data?.message || "Gagal menyimpan potensi.");
  } finally {
    isSubmittingPotensi.value = false;
  }
};

// ── Dialog: Batal Potensi ──
const showBatalPotensiDialog = ref(false);
const potensiToBatal = ref<PotensiItem | null>(null);
const batalPotensiAlasan = ref("");
const isSubmittingBatalPotensi = ref(false);

const openBatalPotensiDialog = (item: PotensiItem) => {
  potensiToBatal.value = item;
  batalPotensiAlasan.value = "";
  showBatalPotensiDialog.value = true;
};

const goToPotensiSource = (item: PotensiItem) => {
  const path =
    item.Sumber === "MAP"
      ? `/penjualan/map/form/${encodeURIComponent(item.NomorSumber)}`
      : `/penjualan/penawaran/edit/${encodeURIComponent(item.NomorSumber)}`;
  router.push(path);
};

const submitBatalPotensi = async () => {
  if (!potensiToBatal.value || !batalPotensiAlasan.value.trim()) return;
  isSubmittingBatalPotensi.value = true;
  try {
    await dashboardService.batalPotensi(
      potensiToBatal.value.pot_nomor,
      batalPotensiAlasan.value.trim(),
    );
    showBatalPotensiDialog.value = false;
    potensiList.value = [];
    potensiOffset.value = 0;
    potensiHasMore.value = true;
    await Promise.allSettled([
      fetchPotensiSummary(),
      loadMorePotensiList(),
      loadMorePotensiBatalList(),
    ]);
  } catch (e: any) {
    alert(e?.response?.data?.message || "Gagal membatalkan potensi.");
  } finally {
    isSubmittingBatalPotensi.value = false;
  }
};

// ── Proyeksi Inkaso ──
interface InkasoItem {
  nomor: string;
  nota: string;
  cusKode: string;
  cusNama: string;
  tanggal: string;
  tempo: string;
  terlambatHari: number;
  nominalAwal: number;
  sisa: number;
  terealisasi: number;
  tglTarget: string | null;
  catatan: string;
  userCreate: string;
}
interface InkasoSales {
  salKode: string;
  salNama: string;
  jmlItem: number;
  totalSisa: number;
  totalTerealisasi: number;
  items: InkasoItem[];
}

const inkasoSummary = ref({
  jmlItem: 0,
  totalProyeksi: 0,
  totalRealisasi: 0,
  totalBatal: 0,
});
const inkasoBySales = ref<InkasoSales[]>([]);
const isLoadingInkaso = ref(false);

const fetchInkaso = async () => {
  isLoadingInkaso.value = true;
  try {
    const res = await dashboardService.getInkasoDashboard();
    const d = res.data?.data;
    if (d) {
      inkasoSummary.value = d.summary;
      inkasoBySales.value = d.bySales ?? [];
    }
  } catch {
    /* silent */
  } finally {
    isLoadingInkaso.value = false;
  }
};

// ── Proyeksi Inkaso — Batal (infinite scroll) ──
interface InkasoBatalItem {
  Nomor: string;
  Nota: string;
  Nominal: number;
  AlasanBatal: string | null;
  DateCreate: string;
  TanggalBatal: string;
  UserCreate: string;
  UserModified: string;
  SalNama: string | null;
  CusNama: string | null;
}

const INK_BATAL_PAGE_SIZE = 20;
const inkasoBatalList = ref<InkasoBatalItem[]>([]);
const inkasoBatalOffset = ref(0);
const inkasoBatalHasMore = ref(true);
const isLoadingMoreInkasoBatal = ref(false);
const inkasoBatalSentinelEl = ref<HTMLElement | null>(null);
let inkasoBatalScrollObserver: IntersectionObserver | null = null;

const loadMoreInkasoBatal = async () => {
  if (!inkasoBatalHasMore.value || isLoadingMoreInkasoBatal.value) return;
  isLoadingMoreInkasoBatal.value = true;
  try {
    loadFailed.InkasoBatal = false;
    const res = await dashboardService.getInkasoBatalList(
      INK_BATAL_PAGE_SIZE,
      inkasoBatalOffset.value,
    );
    const rows: InkasoBatalItem[] = res.data.data.items ?? [];
    inkasoBatalList.value.push(...rows);
    inkasoBatalOffset.value += rows.length;
    if (rows.length < INK_BATAL_PAGE_SIZE) inkasoBatalHasMore.value = false;
  } catch {
    inkasoBatalHasMore.value = false;
    loadFailed.InkasoBatal = true;
  } finally {
    isLoadingMoreInkasoBatal.value = false;
  }
};

const setupInkasoBatalObserver = () => {
  if (inkasoBatalScrollObserver) inkasoBatalScrollObserver.disconnect();
  if (!inkasoBatalSentinelEl.value) return;
  inkasoBatalScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreInkasoBatal();
    },
    { threshold: 0.1 },
  );
  inkasoBatalScrollObserver.observe(inkasoBatalSentinelEl.value);
};

const resetInkasoBatal = () => {
  inkasoBatalList.value = [];
  inkasoBatalOffset.value = 0;
  inkasoBatalHasMore.value = true;
};

const todayLocalStr = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD lokal
const fmtTglIso = (s: string | null) =>
  s ? s.split("-").reverse().join("-") : "-";
const lewatTarget = (it: InkasoItem) =>
  !!it.tglTarget && it.tglTarget < todayLocalStr();
const telatColor = (hari: number) => (hari > 90 ? C.bad : C.warn);

// ── Dialog: Set Inkaso (per sales, sumber Target Collection bulan ini) ──
interface InkasoTargetRow {
  jenis: "BARU" | "LAMA";
  nota: string;
  notaAsli: string;
  tanggal: string;
  tempo: string;
  terlambatHari: number;
  cusKode: string;
  cusNama: string;
  debet: number;
  sisaKini: number;
  sudahDitandai: boolean;
}

const INKASO_TOL = 1000; // sisa <= Rp 1.000 tidak ditampilkan (sama dengan Rekap Piutang)
const showSetInkasoDialog = ref(false);
const isLoadingInkasoSales = ref(false);
const isLoadingInkasoRows = ref(false);
const inkasoPeriode = ref({ bulan: 0, tahun: 0 });
const inkasoSalesList = ref<TargetCollectionItem[]>([]);
const inkasoSalesTab = ref("");
const inkasoRowsBySales = ref<Record<string, InkasoTargetRow[]>>({});
const inkasoTglTarget = ref<Record<string, string>>({});
const inkasoCatatan = ref("");
const isSubmittingInkaso = ref(false);

const inkasoPeriodeLabel = computed(() =>
  inkasoPeriode.value.bulan
    ? `${BULAN_LABEL[inkasoPeriode.value.bulan - 1]} ${inkasoPeriode.value.tahun}`
    : "",
);

// Satu baris per customer di tab sales aktif; kuncinya dipakai untuk menyimpan tanggal
interface InkasoCustomerRow {
  key: string; // salKode|cusKode
  cusNama: string;
  totalSisa: number;
  notas: string[]; // semua invoice outstanding customer ini (dikirim saat simpan)
}

const buildInkasoCustomers = (salKode: string): InkasoCustomerRow[] => {
  const map = new Map<string, InkasoCustomerRow>();
  for (const r of inkasoRowsBySales.value[salKode] ?? []) {
    const key = `${salKode}|${r.cusKode || r.cusNama}`;
    const cur = map.get(key);
    if (cur) {
      cur.totalSisa += r.sisaKini;
      cur.notas.push(r.notaAsli);
    } else {
      map.set(key, {
        key,
        cusNama: r.cusNama || r.cusKode,
        totalSisa: r.sisaKini,
        notas: [r.notaAsli],
      });
    }
  }
  return [...map.values()].sort((a, b) => a.cusNama.localeCompare(b.cusNama));
};

const inkasoCustomersAktif = computed(() =>
  buildInkasoCustomers(inkasoSalesTab.value),
);
const inkasoTotalTab = computed(() =>
  inkasoCustomersAktif.value.reduce((s, c) => s + c.totalSisa, 0),
);

// Customer (di semua tab sales) yang tanggal pembayarannya sudah diisi
const inkasoCustomersTerisi = computed(() =>
  Object.keys(inkasoRowsBySales.value)
    .flatMap((salKode) => buildInkasoCustomers(salKode))
    .filter((c) => !!inkasoTglTarget.value[c.key]),
);
const inkasoTotalTerisi = computed(() =>
  inkasoCustomersTerisi.value.reduce((s, c) => s + c.totalSisa, 0),
);
const terisiPerSales = (salKode: string) =>
  buildInkasoCustomers(salKode).filter((c) => !!inkasoTglTarget.value[c.key])
    .length;

const loadInkasoSales = async () => {
  isLoadingInkasoSales.value = true;
  try {
    const now = new Date();
    const bulan = now.getMonth() + 1;
    const tahun = now.getFullYear();
    const key = `${tahun}-${bulan}`;
    let data = targetCollectionCache.get(key);
    if (!data) {
      const res = await dashboardService.getTargetCollectionSales(bulan, tahun);
      data = res.data.data as TargetCollectionData;
      targetCollectionCache.set(key, data);
    }
    inkasoPeriode.value = { bulan, tahun };
    inkasoSalesList.value = (data.items ?? []).filter(
      (s) => s.piutangSaatIni > 0 || s.targetPiutangLama > 0,
    );
  } catch {
    inkasoSalesList.value = [];
  } finally {
    isLoadingInkasoSales.value = false;
  }
};

const loadInkasoRows = async (salKode: string) => {
  if (inkasoRowsBySales.value[salKode]) return;
  isLoadingInkasoRows.value = true;
  try {
    const res = await dashboardService.getTargetCollectionDetail({
      salKode,
      bulan: inkasoPeriode.value.bulan,
      tahun: inkasoPeriode.value.tahun,
    });
    const items: InkasoTargetRow[] = res.data.data?.items ?? [];
    inkasoRowsBySales.value = {
      ...inkasoRowsBySales.value,
      [salKode]: items.filter(
        (r) => r.sisaKini > INKASO_TOL && !r.sudahDitandai,
      ),
    };
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response
      ?.data?.message;
    alert(msg || "Gagal memuat invoice sales ini.");
  } finally {
    isLoadingInkasoRows.value = false;
  }
};

watch(inkasoSalesTab, (kode) => {
  if (kode) loadInkasoRows(kode);
});

const openSetInkasoDialog = async () => {
  showSetInkasoDialog.value = true;
  inkasoCatatan.value = "";
  inkasoTglTarget.value = {};
  inkasoRowsBySales.value = {};
  inkasoSalesTab.value = "";
  await loadInkasoSales();
  if (inkasoSalesList.value.length) {
    inkasoSalesTab.value = inkasoSalesList.value[0].salKode;
  }
};

const submitSetInkaso = async () => {
  if (!inkasoCustomersTerisi.value.length) return;
  isSubmittingInkaso.value = true;
  try {
    const items = inkasoCustomersTerisi.value.flatMap((c) =>
      c.notas.map((nota) => ({
        nota,
        tglTarget: inkasoTglTarget.value[c.key],
        catatan: inkasoCatatan.value.trim() || undefined,
      })),
    );
    await dashboardService.setInkasoBulk(items);
    showSetInkasoDialog.value = false;
    await fetchInkaso();
  } catch (e: unknown) {
    // all-or-nothing: pesan server menyebut invoice mana yang bermasalah
    const msg = (e as { response?: { data?: { message?: string } } })?.response
      ?.data?.message;
    alert(msg || "Gagal menyimpan proyeksi inkaso.");
  } finally {
    isSubmittingInkaso.value = false;
  }
};

// ── Dialog: Batal Inkaso ──
const showBatalInkasoDialog = ref(false);
const inkasoToBatal = ref<InkasoItem | null>(null);
const batalInkasoAlasan = ref("");
const isSubmittingBatalInkaso = ref(false);

const openBatalInkasoDialog = (item: InkasoItem) => {
  inkasoToBatal.value = item;
  batalInkasoAlasan.value = "";
  showBatalInkasoDialog.value = true;
};

const submitBatalInkaso = async () => {
  if (!inkasoToBatal.value || !batalInkasoAlasan.value.trim()) return;
  isSubmittingBatalInkaso.value = true;
  try {
    await dashboardService.batalInkaso(
      inkasoToBatal.value.nomor,
      batalInkasoAlasan.value.trim(),
    );
    showBatalInkasoDialog.value = false;
    resetInkasoBatal();
    await Promise.allSettled([fetchInkaso(), loadMoreInkasoBatal()]);
    await nextTick();
    setupInkasoBatalObserver();
  } catch (e: any) {
    alert(e?.response?.data?.message || "Gagal membatalkan proyeksi inkaso.");
  } finally {
    isSubmittingBatalInkaso.value = false;
  }
};

// ── Computed helper: Achievement rate color ──
const achColor = (ach: number) => {
  if (ach >= 100) return "var(--dsh-good)";
  if (ach >= 70) return "var(--dsh-warn)";
  return "var(--dsh-bad)";
};

const achChartEl = ref<HTMLElement | null>(null);
const achTopSalesChartEl = ref<HTMLElement | null>(null);

const renderAchievementChart = async () => {
  await nextTick();
  const win = window as any;
  if (!win.c3) return;

  try {
    if (achChartEl.value && achievementData.value.byDivisi.length) {
      if (achChartEl.value.innerHTML) achChartEl.value.innerHTML = "";
      const divisi = achievementData.value.byDivisi;
      win.c3.generate({
        bindto: achChartEl.value,
        size: { height: 220 },
        data: {
          x: "divisi",
          columns: [
            ["divisi", ...divisi.map((d) => d.Divisi)],
            ["Target", ...divisi.map((d) => d.Target)],
            ["Realisasi", ...divisi.map((d) => d.Realisasi)],
          ],
          type: "bar",
          colors: { Target: C.track, Realisasi: C.accent },
        },
        bar: { width: { ratio: 0.5 } },
        axis: {
          x: { type: "category" },
          y: { tick: { format: (v: number) => shortNum(v) } },
        },
        legend: { position: "inset" },
        grid: { y: { show: true } },
      });
    }
  } catch (e) {
    console.error("Gagal render chart achievement byDivisi:", e);
  }

  try {
    if (achTopSalesChartEl.value && achievementData.value.topSales.length) {
      if (achTopSalesChartEl.value.innerHTML)
        achTopSalesChartEl.value.innerHTML = "";
      const top = achievementData.value.topSales;
      win.c3.generate({
        bindto: achTopSalesChartEl.value,
        size: { height: 200 },
        data: {
          x: "sales",
          columns: [
            ["sales", ...top.map((s) => s.SalNama)],
            ["Ach%", ...top.map((s) => Math.round(s.Ach))],
          ],
          type: "bar",
          colors: { "Ach%": C.accent },
        },
        bar: { width: { ratio: 0.6 } },
        axis: {
          rotated: true,
          x: { type: "category" },
          y: { max: 100, tick: { values: [0, 25, 50, 75, 100] } },
        },
        legend: { show: false },
        grid: { y: { show: true } },
      });
    }
  } catch (e) {
    console.error("Gagal render chart top sales:", e);
  }
};

watch(
  () =>
    [achievementData.value.byDivisi.length, isLoadingDashboard.value] as const,
  ([len, loading]) => {
    if (len > 0 && !loading) {
      renderAchievementChart();
    }
  },
);

// ── Infinite scroll: Bahan Kurang ──
const BAHAN_KURANG_PAGE_SIZE = 20;
const bahanKurangList = ref<BahanKurangItem[]>([]);
const bahanKurangOffset = ref(0);
const bahanKurangHasMore = ref(true);
const isLoadingMoreBahanKurang = ref(false);
const bahanKurangSentinelEl = ref<HTMLElement | null>(null);
let bahanKurangScrollObserver: IntersectionObserver | null = null;

const loadMoreBahanKurang = async () => {
  if (!bahanKurangHasMore.value || isLoadingMoreBahanKurang.value) return;
  isLoadingMoreBahanKurang.value = true;
  try {
    loadFailed.BahanKurang = false;
    const res = await dashboardService.getBahanKurangList(
      BAHAN_KURANG_PAGE_SIZE,
      bahanKurangOffset.value,
    );
    const rows: BahanKurangItem[] = res.data.data;
    bahanKurangList.value.push(...rows);
    bahanKurangOffset.value += rows.length;
    if (rows.length < BAHAN_KURANG_PAGE_SIZE) bahanKurangHasMore.value = false;
  } catch {
    loadFailed.BahanKurang = true;
  } finally {
    isLoadingMoreBahanKurang.value = false;
  }
};

const setupBahanKurangObserver = () => {
  if (bahanKurangScrollObserver) bahanKurangScrollObserver.disconnect();
  if (!bahanKurangSentinelEl.value) return;
  bahanKurangScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreBahanKurang();
    },
    { threshold: 0.1 },
  );
  bahanKurangScrollObserver.observe(bahanKurangSentinelEl.value);
};

const setupGudangObservers = async () => {
  await nextTick();
  setupBahanKurangObserver();
  setupSpkBelumMkbObserver();
  setupOutstandingObserver();
  setupEfisiensiObserver();
  setupSpkStbjObserver();
  setupSpkSjObserver();
};

// ── Infinite scroll: Stok Acc vs MKA ──
const STOK_ACC_MKA_PAGE_SIZE = 20;
const stokAccVsMkaList = ref<StokAccVsMkaItem[]>([]);
const stokAccVsMkaOffset = ref(0);
const stokAccVsMkaHasMore = ref(true);
const isLoadingMoreStokAccVsMka = ref(false);
const stokAccVsMkaSentinelEl = ref<HTMLElement | null>(null);
let stokAccVsMkaScrollObserver: IntersectionObserver | null = null;

const loadMoreStokAccVsMka = async () => {
  if (!stokAccVsMkaHasMore.value || isLoadingMoreStokAccVsMka.value) return;
  isLoadingMoreStokAccVsMka.value = true;
  try {
    loadFailed.StokAccVsMka = false;
    const res = await dashboardService.getStokAccVsMkaList(
      STOK_ACC_MKA_PAGE_SIZE,
      stokAccVsMkaOffset.value,
    );
    const rows: StokAccVsMkaItem[] = res.data.data;
    stokAccVsMkaList.value.push(...rows);
    stokAccVsMkaOffset.value += rows.length;
    if (rows.length < STOK_ACC_MKA_PAGE_SIZE) stokAccVsMkaHasMore.value = false;
  } catch {
    loadFailed.StokAccVsMka = true;
  } finally {
    isLoadingMoreStokAccVsMka.value = false;
  }
};

const setupStokAccVsMkaObserver = () => {
  if (stokAccVsMkaScrollObserver) stokAccVsMkaScrollObserver.disconnect();
  if (!stokAccVsMkaSentinelEl.value) return;
  stokAccVsMkaScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreStokAccVsMka();
    },
    { threshold: 0.1 },
  );
  stokAccVsMkaScrollObserver.observe(stokAccVsMkaSentinelEl.value);
};

// ── Infinite scroll: SPK Belum MKB ──
const SPK_BELUM_MKB_PAGE_SIZE = 20;
const spkBelumMkbList = ref<SpkBelumMkbItem[]>([]);
const spkBelumMkbOffset = ref(0);
const spkBelumMkbHasMore = ref(true);
const isLoadingMoreSpkBelumMkb = ref(false);
const spkBelumMkbSentinelEl = ref<HTMLElement | null>(null);
let spkBelumMkbScrollObserver: IntersectionObserver | null = null;

const loadMoreSpkBelumMkb = async () => {
  if (!spkBelumMkbHasMore.value || isLoadingMoreSpkBelumMkb.value) return;
  isLoadingMoreSpkBelumMkb.value = true;
  try {
    loadFailed.SpkBelumMkb = false;
    const res = await dashboardService.getSpkBelumMkbListPaged(
      SPK_BELUM_MKB_PAGE_SIZE,
      spkBelumMkbOffset.value,
    );
    const rows: SpkBelumMkbItem[] = res.data.data;
    spkBelumMkbList.value.push(...rows);
    spkBelumMkbOffset.value += rows.length;
    if (rows.length < SPK_BELUM_MKB_PAGE_SIZE) spkBelumMkbHasMore.value = false;
  } catch {
    loadFailed.SpkBelumMkb = true;
  } finally {
    isLoadingMoreSpkBelumMkb.value = false;
  }
};

const setupSpkBelumMkbObserver = () => {
  if (spkBelumMkbScrollObserver) spkBelumMkbScrollObserver.disconnect();
  if (!spkBelumMkbSentinelEl.value) return;
  spkBelumMkbScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreSpkBelumMkb();
    },
    { threshold: 0.1 },
  );
  spkBelumMkbScrollObserver.observe(spkBelumMkbSentinelEl.value);
};

// ── Infinite scroll: Outstanding PO Mitra ──
const OUTSTANDING_PAGE_SIZE = 20;
const outstandingPoMitraList = ref<OutstandingMitraItem[]>([]);
const outstandingOffset = ref(0);
const outstandingHasMore = ref(true);
const isLoadingMoreOutstanding = ref(false);
const outstandingSentinelEl = ref<HTMLElement | null>(null);
let outstandingScrollObserver: IntersectionObserver | null = null;

const loadMoreOutstanding = async () => {
  if (!outstandingHasMore.value || isLoadingMoreOutstanding.value) return;
  isLoadingMoreOutstanding.value = true;
  try {
    loadFailed.Outstanding = false;
    const res = await dashboardService.getOutstandingPoMitraList(
      OUTSTANDING_PAGE_SIZE,
      outstandingOffset.value,
    );
    const rows: OutstandingMitraItem[] = res.data.data;
    outstandingPoMitraList.value.push(...rows);
    outstandingOffset.value += rows.length;
    if (rows.length < OUTSTANDING_PAGE_SIZE) outstandingHasMore.value = false;
  } catch {
    loadFailed.Outstanding = true;
  } finally {
    isLoadingMoreOutstanding.value = false;
  }
};

const setupOutstandingObserver = () => {
  if (outstandingScrollObserver) outstandingScrollObserver.disconnect();
  if (!outstandingSentinelEl.value) return;
  outstandingScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreOutstanding();
    },
    { threshold: 0.1 },
  );
  outstandingScrollObserver.observe(outstandingSentinelEl.value);
};

// ── Infinite scroll: Efisiensi Babaran ──
const EFISIENSI_PAGE_SIZE = 20;
const efisiensiBabaranList = ref<EfisiensiBabaranItem[]>([]);
const efisiensiOffset = ref(0);
const efisiensiHasMore = ref(true);
const isLoadingMoreEfisiensi = ref(false);
const efisiensiSentinelEl = ref<HTMLElement | null>(null);
let efisiensiScrollObserver: IntersectionObserver | null = null;

const loadMoreEfisiensi = async () => {
  if (!efisiensiHasMore.value || isLoadingMoreEfisiensi.value) return;
  isLoadingMoreEfisiensi.value = true;
  try {
    loadFailed.Efisiensi = false;
    const res = await dashboardService.getEfisiensiBabaranList(
      EFISIENSI_PAGE_SIZE,
      efisiensiOffset.value,
    );
    const rows: EfisiensiBabaranItem[] = res.data.data;
    efisiensiBabaranList.value.push(...rows);
    efisiensiOffset.value += rows.length;
    if (rows.length < EFISIENSI_PAGE_SIZE) efisiensiHasMore.value = false;
  } catch {
    loadFailed.Efisiensi = true;
  } finally {
    isLoadingMoreEfisiensi.value = false;
  }
};

const setupEfisiensiObserver = () => {
  if (efisiensiScrollObserver) efisiensiScrollObserver.disconnect();
  if (!efisiensiSentinelEl.value) return;
  efisiensiScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreEfisiensi();
    },
    { threshold: 0.1 },
  );
  efisiensiScrollObserver.observe(efisiensiSentinelEl.value);
};

// ── a. MAP/SPK belum permintaan & realisasi ──
const mapSpkBelumPermintaanSummary = ref({ total: 0 });
const MSP_PAGE_SIZE = 20;
const mapSpkBelumPermintaanList = ref<any[]>([]);
const mspOffset = ref(0);
const mspHasMore = ref(true);
const isLoadingMoreMsp = ref(false);
const mspSentinelEl = ref<HTMLElement | null>(null);
let mspScrollObserver: IntersectionObserver | null = null;

const loadMoreMsp = async () => {
  if (!mspHasMore.value || isLoadingMoreMsp.value) return;
  isLoadingMoreMsp.value = true;
  try {
    loadFailed.Msp = false;
    const res = await dashboardService.getMapSpkBelumPermintaanList(
      MSP_PAGE_SIZE,
      mspOffset.value,
    );
    const rows: any[] = res.data.data;
    mapSpkBelumPermintaanList.value.push(...rows);
    mspOffset.value += rows.length;
    if (rows.length < MSP_PAGE_SIZE) mspHasMore.value = false;
  } catch {
    loadFailed.Msp = true;
  } finally {
    isLoadingMoreMsp.value = false;
  }
};
const setupMspObserver = () => {
  if (mspScrollObserver) mspScrollObserver.disconnect();
  if (!mspSentinelEl.value) return;
  mspScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreMsp();
    },
    { threshold: 0.1 },
  );
  mspScrollObserver.observe(mspSentinelEl.value);
};

// ── b. Permintaan Bahan belum direalisasi ──
const permintaanBelumRealisasiSummary = ref({
  Total: 0,
  BelumSamaSekali: 0,
  Sebagian: 0,
});
const PBR_PAGE_SIZE = 20;
const permintaanBelumRealisasiList = ref<any[]>([]);
const pbrOffset = ref(0);
const pbrHasMore = ref(true);
const isLoadingMorePbr = ref(false);
const pbrSentinelEl = ref<HTMLElement | null>(null);
let pbrScrollObserver: IntersectionObserver | null = null;

const loadMorePbr = async () => {
  if (!pbrHasMore.value || isLoadingMorePbr.value) return;
  isLoadingMorePbr.value = true;
  try {
    loadFailed.Pbr = false;
    const res = await dashboardService.getPermintaanBelumRealisasiList(
      PBR_PAGE_SIZE,
      pbrOffset.value,
    );
    const rows: any[] = res.data.data;
    permintaanBelumRealisasiList.value.push(...rows);
    pbrOffset.value += rows.length;
    if (rows.length < PBR_PAGE_SIZE) pbrHasMore.value = false;
  } catch {
    loadFailed.Pbr = true;
  } finally {
    isLoadingMorePbr.value = false;
  }
};
const setupPbrObserver = () => {
  if (pbrScrollObserver) pbrScrollObserver.disconnect();
  if (!pbrSentinelEl.value) return;
  pbrScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePbr();
    },
    { threshold: 0.1 },
  );
  pbrScrollObserver.observe(pbrSentinelEl.value);
};

// ── c. PO Bahan belum datang ──
const poBahanBelumDatangSummary = ref({ total: 0 });
const PBD_PAGE_SIZE = 20;
const poBahanBelumDatangList = ref<any[]>([]);
const pbdOffset = ref(0);
const pbdHasMore = ref(true);
const isLoadingMorePbd = ref(false);
const pbdSentinelEl = ref<HTMLElement | null>(null);
let pbdScrollObserver: IntersectionObserver | null = null;

const loadMorePbd = async () => {
  if (!pbdHasMore.value || isLoadingMorePbd.value) return;
  isLoadingMorePbd.value = true;
  try {
    loadFailed.Pbd = false;
    const res = await dashboardService.getPoBahanBelumDatangList(
      PBD_PAGE_SIZE,
      pbdOffset.value,
    );
    const rows: any[] = res.data.data;
    poBahanBelumDatangList.value.push(...rows);
    pbdOffset.value += rows.length;
    if (rows.length < PBD_PAGE_SIZE) pbdHasMore.value = false;
  } catch {
    loadFailed.Pbd = true;
  } finally {
    isLoadingMorePbd.value = false;
  }
};
const setupPbdObserver = () => {
  if (pbdScrollObserver) pbdScrollObserver.disconnect();
  if (!pbdSentinelEl.value) return;
  pbdScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePbd();
    },
    { threshold: 0.1 },
  );
  pbdScrollObserver.observe(pbdSentinelEl.value);
};

// ── d. SO belum MKB (state terpisah, khusus tab gudang-bahan) ──
const gbSpkBelumMkbCount = ref(0);
const GB_MKB_PAGE_SIZE = 20;
const gbSpkBelumMkbList = ref<any[]>([]);
const gbMkbOffset = ref(0);
const gbMkbHasMore = ref(true);
const isLoadingMoreGbMkb = ref(false);
const gbMkbSentinelEl = ref<HTMLElement | null>(null);
let gbMkbScrollObserver: IntersectionObserver | null = null;

const loadMoreGbMkb = async () => {
  if (!gbMkbHasMore.value || isLoadingMoreGbMkb.value) return;
  isLoadingMoreGbMkb.value = true;
  try {
    loadFailed.GbMkb = false;
    const res = await dashboardService.getSpkBelumMkbListPaged(
      GB_MKB_PAGE_SIZE,
      gbMkbOffset.value,
    );
    const rows: any[] = res.data.data;
    gbSpkBelumMkbList.value.push(...rows);
    gbMkbOffset.value += rows.length;
    if (rows.length < GB_MKB_PAGE_SIZE) gbMkbHasMore.value = false;
  } catch {
    loadFailed.GbMkb = true;
  } finally {
    isLoadingMoreGbMkb.value = false;
  }
};
const setupGbMkbObserver = () => {
  if (gbMkbScrollObserver) gbMkbScrollObserver.disconnect();
  if (!gbMkbSentinelEl.value) return;
  gbMkbScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreGbMkb();
    },
    { threshold: 0.1 },
  );
  gbMkbScrollObserver.observe(gbMkbSentinelEl.value);
};

// ── e. MKA belum direalisasi (state terpisah, khusus tab gudang-bahan) ──
const gbStokAccVsMkaCount = ref(0);
const GB_MKA_PAGE_SIZE = 20;
const gbStokAccVsMkaList = ref<any[]>([]);
const gbMkaOffset = ref(0);
const gbMkaHasMore = ref(true);
const isLoadingMoreGbMka = ref(false);
const gbMkaSentinelEl = ref<HTMLElement | null>(null);
let gbMkaScrollObserver: IntersectionObserver | null = null;

const loadMoreGbMka = async () => {
  if (!gbMkaHasMore.value || isLoadingMoreGbMka.value) return;
  isLoadingMoreGbMka.value = true;
  try {
    loadFailed.GbMka = false;
    const res = await dashboardService.getStokAccVsMkaList(
      GB_MKA_PAGE_SIZE,
      gbMkaOffset.value,
    );
    const rows: any[] = res.data.data;
    gbStokAccVsMkaList.value.push(...rows);
    gbMkaOffset.value += rows.length;
    if (rows.length < GB_MKA_PAGE_SIZE) gbMkaHasMore.value = false;
  } catch {
    loadFailed.GbMka = true;
  } finally {
    isLoadingMoreGbMka.value = false;
  }
};
const setupGbMkaObserver = () => {
  if (gbMkaScrollObserver) gbMkaScrollObserver.disconnect();
  if (!gbMkaSentinelEl.value) return;
  gbMkaScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreGbMka();
    },
    { threshold: 0.1 },
  );
  gbMkaScrollObserver.observe(gbMkaSentinelEl.value);
};
const loadMoreSb = async () => {
  if (!sbHasMore.value || isLoadingMoreSb.value) return;
  isLoadingMoreSb.value = true;
  try {
    loadFailed.Sb = false;
    const res = await dashboardService.getStokBebasList(
      SB_PAGE_SIZE,
      sbOffset.value,
    );
    const rows: StokBebasItem[] = res.data.data;
    stokBebasList.value.push(...rows);
    sbOffset.value += rows.length;
    if (rows.length < SB_PAGE_SIZE) sbHasMore.value = false;
  } catch {
    loadFailed.Sb = true;
  } finally {
    isLoadingMoreSb.value = false;
  }
};
const setupSbObserver = () => {
  if (sbScrollObserver) sbScrollObserver.disconnect();
  if (!sbSentinelEl.value) return;
  sbScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreSb();
    },
    { threshold: 0.1 },
  );
  sbScrollObserver.observe(sbSentinelEl.value);
};
const loadMoreBk = async () => {
  if (!bkHasMore.value || isLoadingMoreBk.value) return;
  isLoadingMoreBk.value = true;
  try {
    loadFailed.Bk = false;
    const res = await dashboardService.getBufferKaosanList(
      BK_PAGE_SIZE,
      bkOffset.value,
    );
    const rows: BufferKaosanItem[] = res.data.data;
    bufferKaosanList.value.push(...rows);
    bkOffset.value += rows.length;
    if (rows.length < BK_PAGE_SIZE) bkHasMore.value = false;
  } catch {
    loadFailed.Bk = true;
  } finally {
    isLoadingMoreBk.value = false;
  }
};
const setupBkObserver = () => {
  if (bkScrollObserver) bkScrollObserver.disconnect();
  if (!bkSentinelEl.value) return;
  bkScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreBk();
    },
    { threshold: 0.1 },
  );
  bkScrollObserver.observe(bkSentinelEl.value);
};
interface RealisasiKonversiDetailItem {
  Nomor: string;
  Tanggal: string;
  Customer: string;
  Divisi: string;
  Nilai: number;
  JmlItem?: number; // widget A
  Qty?: number; // widget B
  TotalMap?: number;
  MapPertama?: string | null;
  TglMapPertama?: string | null;
  TotalSo?: number;
  SoPertama?: string | null;
  TglSoPertama?: string | null;
  HariKonversi: number | null;
  Status: string;
}

const PTM_DETAIL_PAGE_SIZE = 20;
const ptmDetailList = ref<RealisasiKonversiDetailItem[]>([]);
const ptmDetailOffset = ref(0);
const ptmDetailHasMore = ref(true);
const isLoadingMorePtmDetail = ref(false);
const ptmDetailSentinelEl = ref<HTMLElement | null>(null);
let ptmDetailScrollObserver: IntersectionObserver | null = null;

const loadMorePtmDetail = async () => {
  if (!ptmDetailHasMore.value || isLoadingMorePtmDetail.value) return;
  isLoadingMorePtmDetail.value = true;
  try {
    loadFailed.PtmDetail = false;
    const res = await dashboardService.getRealisasiPenawaranToMapDetail(
      PTM_DETAIL_PAGE_SIZE,
      ptmDetailOffset.value,
    );
    const rows: RealisasiKonversiDetailItem[] = res.data.data;
    ptmDetailList.value.push(...rows);
    ptmDetailOffset.value += rows.length;
    if (rows.length < PTM_DETAIL_PAGE_SIZE) ptmDetailHasMore.value = false;
  } catch {
    loadFailed.PtmDetail = true;
  } finally {
    isLoadingMorePtmDetail.value = false;
  }
};
const setupPtmDetailObserver = () => {
  if (ptmDetailScrollObserver) ptmDetailScrollObserver.disconnect();
  if (!ptmDetailSentinelEl.value) return;
  ptmDetailScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePtmDetail();
    },
    { threshold: 0.1 },
  );
  ptmDetailScrollObserver.observe(ptmDetailSentinelEl.value);
};

const MTS_DETAIL_PAGE_SIZE = 20;
const mtsDetailList = ref<RealisasiKonversiDetailItem[]>([]);
const mtsDetailOffset = ref(0);
const mtsDetailHasMore = ref(true);
const isLoadingMoreMtsDetail = ref(false);
const mtsDetailSentinelEl = ref<HTMLElement | null>(null);
let mtsDetailScrollObserver: IntersectionObserver | null = null;

const loadMoreMtsDetail = async () => {
  if (!mtsDetailHasMore.value || isLoadingMoreMtsDetail.value) return;
  isLoadingMoreMtsDetail.value = true;
  try {
    loadFailed.MtsDetail = false;
    const res = await dashboardService.getRealisasiMapToSoDetail(
      MTS_DETAIL_PAGE_SIZE,
      mtsDetailOffset.value,
    );
    const rows: RealisasiKonversiDetailItem[] = res.data.data;
    mtsDetailList.value.push(...rows);
    mtsDetailOffset.value += rows.length;
    if (rows.length < MTS_DETAIL_PAGE_SIZE) mtsDetailHasMore.value = false;
  } catch {
    loadFailed.MtsDetail = true;
  } finally {
    isLoadingMoreMtsDetail.value = false;
  }
};
const setupMtsDetailObserver = () => {
  if (mtsDetailScrollObserver) mtsDetailScrollObserver.disconnect();
  if (!mtsDetailSentinelEl.value) return;
  mtsDetailScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreMtsDetail();
    },
    { threshold: 0.1 },
  );
  mtsDetailScrollObserver.observe(mtsDetailSentinelEl.value);
};

// ── Computed helpers MAP ──
const mapSpkRate = computed(() => {
  if (!mapSpkMetric.value.TotalMAP) return 0;
  return Math.round(
    (mapSpkMetric.value.SudahSO / mapSpkMetric.value.TotalMAP) * 100,
  );
});
const mapKirimRate = computed(() => {
  if (!mapSjMetric.value.TotalQtyOrder) return 0;
  return Math.round(
    (mapSjMetric.value.TotalQtyKirim / mapSjMetric.value.TotalQtyOrder) * 100,
  );
});

const AKT_PAGE_SIZE = 20;
const aktOffset = ref(0);
const aktHasMore = ref(true);
const isLoadingMoreAkt = ref(false);
const aktSentinelEl = ref<HTMLElement | null>(null);
let aktScrollObserver: IntersectionObserver | null = null;

// Menu ID per jenis — untuk filter permission
const JENIS_MENU_ID: Record<string, string> = {
  SPK: "152",
  SO: "172", // ⚠️ isi MENU_ID modul SO
  MAP: "162",
  SJ: "153", // ⚠️ isi MENU_ID modul SJ (kemungkinan "163" berdasarkan menuId di SjMapFormView)
  PENAWARAN: "151",
  INVOICE: "157",
};

// Filter berdasarkan permission user
const filterAktivitasByPermission = (list: any[]) => {
  return list.filter((item) => {
    const menuId = JENIS_MENU_ID[item.jenis];
    if (!menuId) return true; // kalau tidak ada definisi, tampilkan
    return authStore.can(menuId, "view");
  });
};

const loadMoreAktivitas = async () => {
  if (!aktHasMore.value || isLoadingMoreAkt.value) return;
  isLoadingMoreAkt.value = true;
  try {
    loadFailed.Akt = false;
    const res = await dashboardService.getAktivitasHariIni(
      AKT_PAGE_SIZE,
      aktOffset.value,
    );
    const rows: any[] = res.data.data || [];
    const filtered = filterAktivitasByPermission(rows);
    aktivitasList.value.push(...filtered);
    aktOffset.value += rows.length;
    if (rows.length < AKT_PAGE_SIZE) aktHasMore.value = false;

    // ← tambah ini: update count setiap kali ada data baru masuk
    animatedAktivitasCount.value = aktivitasList.value.length;
  } catch {
    loadFailed.Akt = true;
  } finally {
    isLoadingMoreAkt.value = false;
  }
};

const setupAktObserver = () => {
  if (aktScrollObserver) aktScrollObserver.disconnect();
  if (!aktSentinelEl.value) return;
  aktScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreAktivitas();
    },
    { threshold: 0.1 },
  );
  aktScrollObserver.observe(aktSentinelEl.value);
};

const renderTrendChart = async () => {
  await nextTick();
  if (!trendChartEl.value || !trendData.value.length) return;
  const win = window as any;
  if (!win.c3) return;

  if (trendChartEl.value.innerHTML) {
    trendChartEl.value.innerHTML = "";
  }
  win.c3.generate({
    bindto: trendChartEl.value,
    size: { height: 160 },
    data: {
      x: "label",
      columns: [
        ["label", ...trendData.value.map((r: any) => r.label)],
        ["MAP Baru", ...trendData.value.map((r: any) => r.map_baru)],
        ["SO Baru", ...trendData.value.map((r: any) => r.so_baru)],
        ["SPK Baru", ...trendData.value.map((r: any) => r.spk_baru)],
      ],
      type: "line",
      colors: {
        "MAP Baru": C.accent,
        "SO Baru": C.slate,
        "SPK Baru": C.warn,
      },
    },
    axis: {
      x: { type: "category", tick: { rotate: 0, multiline: false } },
      y: { min: 0, padding: { bottom: 0 } },
    },
    legend: { position: "inset" },
    grid: { y: { show: true } },
    tooltip: { grouped: true },
  });
};

const jenisColor: Record<string, string> = {
  PENAWARAN: C.accent,
  MAP: C.accent,
  SO: C.accent,
  SPK: C.slate,
  SJ: C.slate,
  INVOICE: C.good,
};

// Ref untuk animasi
const animatedSpkAktif = ref(0);
const animatedTerlambat = ref(0);
const animatedDeadlineHariIni = ref(0);
const animatedSegera = ref(0);
const animatedAktivitasCount = ref(0);

// Animasi count-up
const animateNumber = (target: Ref<number>, newVal: number, duration = 600) => {
  const start = target.value;
  const diff = newVal - start;
  if (diff === 0) return;

  const startTime = performance.now();
  const step = (now: number) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Easing: ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    target.value = Math.round(start + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

// Polling ringan — hanya SPK summary + aktivitas
let pollingTimer: ReturnType<typeof setInterval> | null = null;

const pollLightData = async () => {
  if (document.hidden) return;
  try {
    const [rSpk, rAktivitas] = await Promise.allSettled([
      dashboardService.getSpkSummary(),
      dashboardService.getAktivitasHariIni(50, 0), // ← 50 item terbaru, offset 0
    ]);

    if (rSpk.status === "fulfilled") {
      const d = rSpk.value.data.data;
      animateNumber(animatedSpkAktif, d.TotalAktif);
      animateNumber(animatedTerlambat, d.Terlambat);
      animateNumber(animatedDeadlineHariIni, d.DeadlineHariIni);
      animateNumber(animatedSegera, d.SegeredDeadline);
      // Update data asli juga
      spkSummary.value = d;
    }

    if (rAktivitas.status === "fulfilled") {
      const newList: any[] = rAktivitas.value.data.data || [];
      const filtered = filterAktivitasByPermission(newList);
      const existingNomors = new Set(
        aktivitasList.value.map((a: any) => a.nomor),
      );
      const brandNew = filtered.filter(
        (a: any) => !existingNomors.has(a.nomor),
      );

      if (brandNew.length > 0) {
        newAktivitasIds.value = new Set(brandNew.map((a: any) => a.nomor));
        aktivitasList.value = [...brandNew, ...aktivitasList.value]; // prepend di atas
        animateNumber(animatedAktivitasCount, aktivitasList.value.length);
        setTimeout(() => {
          newAktivitasIds.value = new Set();
        }, 3000);
      }
    }
  } catch {
    /* silent */
  }
};

const newAktivitasIds = ref<Set<string>>(new Set());

const startPolling = () => {
  stopPolling();
  pollingTimer = setInterval(pollLightData, 60_000);
};

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
};

interface TrendHariRow {
  label: string;
  map_baru: number;
  so_baru: number;
  spk_baru: number;
}

const applySpkSummary = (d: typeof spkSummary.value) => {
  spkSummary.value = d;
  animatedSpkAktif.value = d.TotalAktif;
  animatedTerlambat.value = d.Terlambat;
  animatedDeadlineHariIni.value = d.DeadlineHariIni;
  animatedSegera.value = d.SegeredDeadline;
};

// ── Overview (selalu di-fetch saat mount, tab ini selalu terlihat) ──
const loadOverviewData = async () => {
  // Kalau snapshot ada, kartu langsung terisi; "—" hanya muncul di kunjungan pertama
  isLoadingDashboard.value = !hasSnapshot("ov:spk-summary");
  aktivitasList.value = [];
  aktOffset.value = 0;
  aktHasMore.value = true;
  try {
    await Promise.allSettled([
      snap(
        "ov:trend7",
        () => payload(dashboardService.getTrendSpk7Hari()),
        (d: TrendHariRow[]) => {
          trendData.value = d || [];
          renderTrendChart();
        },
      ),
      loadMoreAktivitas(),
      snap(
        "ov:spk-summary",
        () => payload(dashboardService.getSpkSummary()),
        applySpkSummary,
      ),
      snap(
        "ov:so-summary",
        () => payload(dashboardService.getSoSummary()),
        (d: typeof soSummary.value) => {
          soSummary.value = d;
        },
      ),
      snap(
        "ov:so-trend",
        () => payload(dashboardService.getSoAktifTrend()),
        (d: typeof soAktifTrend.value) => {
          soAktifTrend.value = d;
        },
      ),
    ]);
    animatedAktivitasCount.value = aktivitasList.value.length;
  } finally {
    isLoadingDashboard.value = false;
  }
};

// ── Shortcut card di Overview — summary ringan dari tab lain ──
const loadOverviewShortcuts = async () => {
  const { startDate, endDate } = pipelineFilter.value;
  const calls: Promise<void>[] = [];

  if (showPenawaran.value) {
    calls.push(
      snap(
        "ov:pen-summary",
        () => payload(dashboardService.getPenawaranSummary()),
        (d: typeof penSummary.value) => {
          penSummary.value = d;
        },
      ),
      snap(
        "ov:map-summary",
        () => payload(dashboardService.getPenawaranMapSummary()),
        (d: typeof mapSummary.value) => {
          mapSummary.value = d;
        },
      ),
    );
  }
  if (showPiutang.value) {
    calls.push(
      snap(
        "ov:piutang-summary",
        () =>
          payload<PiutangData>(dashboardService.getPiutangDashboard()).then(
            (d) => d.summary,
          ),
        (d: PiutangData["summary"]) => {
          piutangData.value.summary = d;
        },
      ),
    );
  }
  if (showCompanyPulse.value) {
    calls.push(
      snap(
        "ov:pulse",
        () => payload(dashboardService.getCompanyPulseSummary()),
        (d: typeof companyPulse.value) => {
          companyPulse.value = d;
        },
      ),
    );
  }
  if (showSaldoKas.value) {
    calls.push(
      snap(
        "ov:saldo-kas",
        () => payload(dashboardService.getSaldoKas()),
        (d: typeof saldoKas.value) => {
          saldoKas.value = d;
        },
      ),
    );
  }
  if (showPoBpb.value) {
    calls.push(
      snap(
        `ov:stbj:${startDate}:${endDate}`,
        () => payload(dashboardService.getSpkVsStbjSummary(startDate, endDate)),
        (d: SpkVsStbjSummary) => {
          spkVsStbjSummary.value = d;
        },
      ),
      snap(
        `ov:sj:${startDate}:${endDate}`,
        () => payload(dashboardService.getSpkVsSjSummary(startDate, endDate)),
        (d: SpkVsSjSummary) => {
          spkVsSjSummary.value = d;
        },
      ),
      snap(
        `ov:pipe:${startDate}:${endDate}`,
        () =>
          payload(dashboardService.getPipelineSpkProduksi(startDate, endDate)),
        (d: PipelineData) => {
          if (d) pipelineData.value = d;
        },
      ),
      snap(
        `ov:pipe2:${startDate}:${endDate}`,
        () =>
          payload(
            dashboardService.getPipelinePenyelesaianSpk(startDate, endDate),
          ),
        (d: PipelinePenyelesaianSpk) => {
          if (d) pipelinePenyelesaianSpk.value = d;
        },
      ),
    );
  }
  if (showGudangBahan.value) {
    calls.push(
      snap(
        "ov:gb-metric",
        () =>
          payload<GudangBahanData>(
            dashboardService.getGudangBahanDashboard(),
          ).then((d) => d.metric),
        (d: GudangBahanMetric) => {
          gudangBahanData.value.metric = d;
        },
      ),
    );
  }
  if (showBarangJadi.value) {
    calls.push(
      snap(
        "ov:bj-metric",
        () => payload(dashboardService.getBarangJadiMetric()),
        (d: BarangJadiMetric) => {
          barangJadiMetric.value = d;
        },
      ),
    );
  }
  if (showPembelian.value) {
    calls.push(
      snap(
        "ov:ob-summary",
        () => payload(dashboardService.getOutstandingBeliSummary()),
        (d: Record<string, number>) => {
          obSummary.value = d ?? {};
        },
      ),
    );
  }

  await Promise.allSettled(calls);
  flowReady.value = true;
};

// ── Marketing ──
const loadMarketingDataInner = async () => {
  if (!showPenawaran.value) return;
  isLoadingDashboard.value = !hasSnapshot("mkt:pen-summary");
  try {
    // ── reset semua list ──
    rpDetailList.value = [];
    rpDetailOffset.value = 0;
    rpDetailHasMore.value = true;
    mapSpkList.value = [];
    mapSpkOffset.value = 0;
    mapSpkHasMore.value = true;
    mapKirimList.value = [];
    mapKirimOffset.value = 0;
    mapKirimHasMore.value = true;
    penawaranBelumSpk.value = [];
    penOffset.value = 0;
    penHasMore.value = true;
    penawaranBelumMap.value = [];
    mapOffset.value = 0;
    mapHasMore.value = true;
    penawaranBatalList.value = [];
    pbBatalOffset.value = 0;
    pbBatalHasMore.value = true;
    achievementData.value = {
      totalTarget: 0,
      totalRealisasi: 0,
      totalAch: 0,
      byDivisi: [],
      topSales: [],
      bottomSales: [],
    };
    growthYoyData.value = [];
    achievementMonthly.value = [];
    gapCustomerList.value = [];
    pvrPage.value = 1;
    pvrHasMore.value = true;
    potensiList.value = [];
    potensiOffset.value = 0;
    potensiHasMore.value = true;
    potensiBatalList.value = [];
    potensiBatalOffset.value = 0;
    potensiBatalHasMore.value = true;
    resetInkasoBatal();
    ptmDetailList.value = [];
    ptmDetailOffset.value = 0;
    ptmDetailHasMore.value = true;
    mtsDetailList.value = [];
    mtsDetailOffset.value = 0;
    mtsDetailHasMore.value = true;
    statusKirimMapData.value = [];
    slowDeadStockData.value = [];
    slowDeadStockPage.value = 1;
    konversiBabaranData.value = [];

    // ── jalankan SEMUA request sekaligus; ringkasan tampil dari snapshot lebih dulu ──
    void ensureTargetCollectionLoaded();

    const summaryCalls: Promise<void>[] = [
      snap(
        "mkt:pen-summary",
        () => payload(dashboardService.getPenawaranSummary()),
        (d: typeof penSummary.value) => {
          penSummary.value = d;
        },
      ),
      snap(
        "mkt:map-summary",
        () => payload(dashboardService.getPenawaranMapSummary()),
        (d: typeof mapSummary.value) => {
          mapSummary.value = d;
        },
      ),
      snap(
        "mkt:batal-summary",
        () => payload(dashboardService.getPenawaranBatalSummary()),
        (d: typeof penawaranBatalSummary.value) => {
          penawaranBatalSummary.value = d;
        },
      ),
      snap(
        "mkt:kunjungan",
        () => payload(dashboardService.getKunjunganSalesSummary()),
        (d: typeof kunjunganRows.value) => {
          kunjunganRows.value = d || [];
        },
      ),
      snap(
        "mkt:realisasi-pen",
        () => payload(dashboardService.getRealisasiPenawaranDashboard()),
        (d: RealisasiData) => {
          realisasiPenawaranData.value = d;
        },
      ),
      snap(
        "mkt:realisasi-bulanan",
        () => payload(dashboardService.getRealisasiPenawaranBulanan()),
        (d: RealisasiBulananDivisi[]) => {
          realisasiBulananData.value = d;
        },
      ),
      snap(
        "mkt:pen-to-map",
        () => payload(dashboardService.getRealisasiPenawaranToMap()),
        (d: KategoriKonversiData) => {
          realisasiPenToMap.value = d;
        },
      ),
      snap(
        "mkt:map-to-so",
        () => payload(dashboardService.getRealisasiMapToSo()),
        (d: KategoriKonversiData) => {
          realisasiMapToSo.value = d;
        },
      ),
      snap(
        "mkt:status-kirim-map",
        () => payload(dashboardService.getStatusPengirimanMapBulanan()),
        (d: StatusKirimMapDivisi[]) => {
          statusKirimMapData.value = d;
        },
      ),
      snap(
        "slow-dead-stock",
        () => payload(dashboardService.getStokSlowDeadStockBahan()),
        (d: SlowDeadStockJenis[]) => {
          slowDeadStockData.value = d;
        },
      ),
      snap(
        "konversi-babaran",
        () => payload(dashboardService.getKonversiBabaranAktual()),
        (d: KonversiBabaranItem[]) => {
          konversiBabaranData.value = d;
        },
      ),
      snap(
        "mkt:map-vs-spk",
        () =>
          payload(
            dashboardService.getMapVsSpkDashboard(mapRangeStart, mapRangeEnd),
          ),
        (d: { metric: MapVsSpkMetric; divisi: MapDivisiItem[] }) => {
          mapSpkMetric.value = d.metric;
          mapDivisi.value = d.divisi;
        },
      ),
      snap(
        "mkt:map-vs-sj",
        () =>
          payload(
            dashboardService.getMapVsSjDashboard(mapRangeStart, mapRangeEnd),
          ),
        (d: MapVsSjMetric) => {
          mapSjMetric.value = d;
        },
      ),
      snap(
        "mkt:ach-summary",
        () => payload(dashboardService.getAchievementSummary()),
        (d: typeof achievementData.value) => {
          achievementData.value = d;
          renderAchievementChart();
        },
      ),
      snap(
        "mkt:ach-monthly",
        () => payload(dashboardService.getAchievementMonthly()),
        (d: AchievementMonthlyRow[]) => {
          achievementMonthly.value = d;
        },
      ),
      snap(
        "mkt:growth-yoy",
        () => payload(dashboardService.getGrowthYoy()),
        (d: GrowthYoyRow[]) => {
          growthYoyData.value = d;
        },
      ),
    ];

    // list ber-scroll: tetap live, tiap fungsi mengisi state-nya sendiri
    const listsP = Promise.allSettled([
      loadMorePenawaran(),
      loadMoreMap(),
      loadMorePbBatal(),
      loadMoreRpDetail(),
      loadMoreMapSpk(),
      loadMoreMapKirim(),
      loadMorePvr(),
      loadMorePtmDetail(),
      loadMoreMtsDetail(),
      fetchPotensiSummary(),
      loadMorePotensiList(),
      loadMorePotensiBatalList(),
      fetchInkaso(),
      loadMoreInkasoBatal(),
    ]);

    await Promise.all(summaryCalls);
    await listsP;

    marketingLoaded.value = true;
  } finally {
    isLoadingDashboard.value = false;
  }
};

let marketingInFlight: Promise<void> | null = null;
const loadMarketingData = (): Promise<void> => {
  if (marketingInFlight) return marketingInFlight;
  marketingInFlight = loadMarketingDataInner().finally(() => {
    marketingInFlight = null;
  });
  return marketingInFlight;
};

// ── Finance / Piutang ──
const loadFinanceData = async () => {
  if (!showPiutang.value) return;
  isLoadingDashboard.value = true;
  try {
    overdueList.value = [];
    overdueOffset.value = 0;
    overdueHasMore.value = true;
    spkBelumTagihList.value = [];
    spkTagihOffset.value = 0;
    spkTagihHasMore.value = true;

    const [piutangRes, penerimaanRes, spkTagihSumRes] =
      await Promise.allSettled([
        dashboardService.getPiutangDashboard(),
        dashboardService.getPenerimaanSummary(),
        dashboardService.getSpkTerkirimBelumTagihSummary(
          spkTagihFilter.value.startDate,
          spkTagihFilter.value.endDate,
        ),
      ]);
    ensureTargetCollectionLoaded();
    if (piutangRes.status === "fulfilled" && piutangRes.value?.data?.data) {
      piutangData.value.summary = piutangRes.value.data.data.summary;
      piutangData.value.top5 = piutangRes.value.data.data.top5;
      piutangData.value.trend = piutangRes.value.data.data.trend;
      piutangData.value.overdue = [];
    }
    if (
      penerimaanRes.status === "fulfilled" &&
      penerimaanRes.value?.data?.data
    ) {
      penerimaanSummary.value = penerimaanRes.value.data.data;
    }
    if (
      spkTagihSumRes.status === "fulfilled" &&
      spkTagihSumRes.value?.data?.data
    )
      spkBelumTagihSummary.value = spkTagihSumRes.value.data.data;

    await Promise.allSettled([loadMoreOverdue(), loadMoreSpkTagih()]);

    financeLoaded.value = true;
  } finally {
    isLoadingDashboard.value = false;
  }
};

// ── Gudang Garmen ──
const loadGudangData = async () => {
  if (!showPoBpb.value) return;
  isLoadingDashboard.value = true;
  try {
    bahanKurangList.value = [];
    bahanKurangOffset.value = 0;
    bahanKurangHasMore.value = true;
    spkBelumMkbList.value = [];
    spkBelumMkbOffset.value = 0;
    spkBelumMkbHasMore.value = true;
    outstandingPoMitraList.value = [];
    outstandingOffset.value = 0;
    outstandingHasMore.value = true;
    efisiensiBabaranList.value = [];
    efisiensiOffset.value = 0;
    efisiensiHasMore.value = true;
    spkBelumStbjList.value = [];
    spkStbjOffset.value = 0;
    spkStbjHasMore.value = true;
    spkBelumKirimList.value = [];
    spkSjOffset.value = 0;
    spkSjHasMore.value = true;

    const [
      poBpbRes,
      bahanKurangCountRes,
      spkBelumMkbCountRes,
      poJasaRes,
      outstandingSumRes,
      efisiensiSumRes,
    ] = await Promise.allSettled([
      dashboardService.getPoBahanBpbSummary(),
      dashboardService.getBahanKurangCount(),
      dashboardService.getSpkBelumMkbCount(),
      dashboardService.getPoJasaVsBpjSummary(),
      dashboardService.getOutstandingPoMitraSummary(),
      dashboardService.getEfisiensiBabaranSummary(),
    ]);
    const [spkStbjSumRes, spkSjSumRes] = await Promise.allSettled([
      dashboardService.getSpkVsStbjSummary(
        pipelineFilter.value.startDate,
        pipelineFilter.value.endDate,
      ),
      dashboardService.getSpkVsSjSummary(
        pipelineFilter.value.startDate,
        pipelineFilter.value.endDate,
      ),
    ]);
    if (spkStbjSumRes.status === "fulfilled" && spkStbjSumRes.value?.data?.data)
      spkVsStbjSummary.value = spkStbjSumRes.value.data.data;
    if (spkSjSumRes.status === "fulfilled" && spkSjSumRes.value?.data?.data)
      spkVsSjSummary.value = spkSjSumRes.value.data.data;
    if (poBpbRes.status === "fulfilled")
      poBpbSummary.value = poBpbRes.value.data.data;
    if (
      bahanKurangCountRes.status === "fulfilled" &&
      bahanKurangCountRes.value?.data?.data
    )
      bahanKurangSummary.value = bahanKurangCountRes.value.data.data;
    if (spkBelumMkbCountRes.status === "fulfilled")
      spkBelumMkbCountVal.value = spkBelumMkbCountRes.value.data.data ?? 0;
    if (poJasaRes.status === "fulfilled" && poJasaRes.value?.data?.data)
      poJasaVsBpjData.value = poJasaRes.value.data.data;
    if (
      outstandingSumRes.status === "fulfilled" &&
      outstandingSumRes.value?.data?.data
    )
      outstandingPoMitraSummary.value = outstandingSumRes.value.data.data;
    if (
      efisiensiSumRes.status === "fulfilled" &&
      efisiensiSumRes.value?.data?.data
    )
      efisiensiBabaranSummary.value = efisiensiSumRes.value.data.data;

    await Promise.allSettled([
      loadMoreBahanKurang(),
      loadMoreSpkBelumMkb(),
      loadMoreOutstanding(),
      loadMoreEfisiensi(),
      loadMoreSpkStbj(),
      loadMoreSpkSj(),
    ]);

    await fetchPipelineData();
    await fetchPipelinePenyelesaianSpk();

    gudangLoaded.value = true;
  } finally {
    isLoadingDashboard.value = false;
  }
};

// ── Gudang Bahan ──
const loadGudangBahanData = async () => {
  if (!showGudangBahan.value) return;
  bufferList.value = [];
  bufferOffset.value = 0;
  bufferHasMore.value = true;
  bahanList.value = [];
  bahanOffset.value = 0;
  bahanHasMore.value = true;
  stokAccVsMkaList.value = [];
  stokAccVsMkaOffset.value = 0;
  stokAccVsMkaHasMore.value = true;

  // ⬅ reset panel actionable baru
  mapSpkBelumPermintaanList.value = [];
  mspOffset.value = 0;
  mspHasMore.value = true;
  permintaanBelumRealisasiList.value = [];
  pbrOffset.value = 0;
  pbrHasMore.value = true;
  poBahanBelumDatangList.value = [];
  pbdOffset.value = 0;
  pbdHasMore.value = true;
  gbSpkBelumMkbList.value = [];
  gbMkbOffset.value = 0;
  gbMkbHasMore.value = true;
  gbStokAccVsMkaList.value = [];
  gbMkaOffset.value = 0;
  gbMkaHasMore.value = true;
  stokBebasList.value = [];
  sbOffset.value = 0;
  sbHasMore.value = true;
  bufferKaosanList.value = [];
  bkOffset.value = 0;
  bkHasMore.value = true;
  slowDeadStockData.value = [];
  slowDeadStockPage.value = 1;
  konversiBabaranData.value = [];

  isLoadingGudangBahan.value = true;
  try {
    const [
      gbRes,
      stokAccMkaCountRes,
      mspSumRes,
      pbrSumRes,
      pbdSumRes,
      gbMkbCountRes,
      sbSumRes,
      bkSumRes,
      slowDeadRes,
      konversiBabaranRes,
    ] = await Promise.allSettled([
      dashboardService.getGudangBahanDashboard(),
      dashboardService.getStokAccVsMkaCount(),
      dashboardService.getMapSpkBelumPermintaanSummary(),
      dashboardService.getPermintaanBelumRealisasiSummary(),
      dashboardService.getPoBahanBelumDatangSummary(),
      dashboardService.getSpkBelumMkbCount(),
      dashboardService.getStokBebasSummary(),
      dashboardService.getBufferKaosanSummary(),
      dashboardService.getStokSlowDeadStockBahan(),
      dashboardService.getKonversiBabaranAktual(),
    ]);
    if (
      konversiBabaranRes.status === "fulfilled" &&
      konversiBabaranRes.value?.data?.data
    ) {
      konversiBabaranData.value = konversiBabaranRes.value.data.data;
    }
    if (slowDeadRes.status === "fulfilled" && slowDeadRes.value?.data?.data) {
      slowDeadStockData.value = slowDeadRes.value.data.data;
    }
    if (gbRes.status === "fulfilled" && gbRes.value?.data?.data) {
      gudangBahanData.value.metric = gbRes.value.data.data.metric;
      gudangBahanData.value.topStok = gbRes.value.data.data.topStok;
      gudangBahanData.value.detailBawahBuffer = [];
      gudangBahanData.value.bahanBarcode = [];
    }
    if (
      stokAccMkaCountRes.status === "fulfilled" &&
      stokAccMkaCountRes.value?.data?.data
    )
      stokAccVsMkaCount.value = stokAccMkaCountRes.value.data.data.total ?? 0;
    if (mspSumRes.status === "fulfilled" && mspSumRes.value?.data?.data)
      mapSpkBelumPermintaanSummary.value = mspSumRes.value.data.data;
    if (pbrSumRes.status === "fulfilled" && pbrSumRes.value?.data?.data)
      permintaanBelumRealisasiSummary.value = pbrSumRes.value.data.data;
    if (pbdSumRes.status === "fulfilled" && pbdSumRes.value?.data?.data)
      poBahanBelumDatangSummary.value = pbdSumRes.value.data.data;
    if (gbMkbCountRes.status === "fulfilled")
      gbSpkBelumMkbCount.value = gbMkbCountRes.value.data.data ?? 0;
    gbStokAccVsMkaCount.value = stokAccVsMkaCount.value;
    if (sbSumRes.status === "fulfilled" && sbSumRes.value?.data?.data)
      stokBebasSummary.value = sbSumRes.value.data.data;
    if (bkSumRes.status === "fulfilled" && bkSumRes.value?.data?.data)
      bufferKaosanSummary.value = bkSumRes.value.data.data;

    await Promise.allSettled([
      loadMoreBuffer(),
      loadMoreBahan(),
      loadMoreStokAccVsMka(),
      loadMoreMsp(),
      loadMorePbr(),
      loadMorePbd(),
      loadMoreGbMkb(),
      loadMoreGbMka(),
      loadMoreSb(),
      loadMoreBk(),
    ]);

    gudangBahanLoaded.value = true;
  } finally {
    isLoadingGudangBahan.value = false;
  }
};

// ── Pembelian: Outstanding Beli ──
interface OutstandingBeliItem {
  Nomor: string;
  Tanggal: string;
  TglInput: string;
  WaktuTunggu: number;
  Peminta: string;
  Nourut: number;
  Item: string;
  Satuan: string;
  QtyMinta: number;
  QtyBeli: number;
  Kekurangan: number;
}
const OB_TABS = [
  { value: "ATK", label: "ATK" },
  { value: "OBAT", label: "Obat" },
  { value: "SPAREPART", label: "Sparepart" },
  { value: "ACCESORIS", label: "Accesoris" },
  { value: "PENGAJUAN_DANA", label: "Pengajuan Dana" },
];
const OB_PAGE_SIZE = 20;
const pembelianLoaded = ref(false);
const isLoadingPembelian = ref(false);
const obTab = ref("ATK");
const obSummary = ref<Record<string, number>>({});
const obList = ref<OutstandingBeliItem[]>([]);
const obTotal = ref(0);
const obOffset = ref(0);
const obHasMore = ref(true);
const isLoadingMoreOb = ref(false);
const obSentinelEl = ref<HTMLElement | null>(null);
let obScrollObserver: IntersectionObserver | null = null;
let obReqId = 0; // cegah respons tab lama menimpa tab baru

const obTotalAll = computed(() =>
  Object.values(obSummary.value).reduce((s, n) => s + Number(n || 0), 0),
);

const loadMoreOb = async () => {
  if (!obHasMore.value || isLoadingMoreOb.value) return;
  isLoadingMoreOb.value = true;
  const myReq = obReqId;
  loadFailed.Ob = false;
  try {
    const res = await dashboardService.getOutstandingBeliList(
      obTab.value,
      OB_PAGE_SIZE,
      obOffset.value,
    );
    if (myReq !== obReqId) return;
    const d = res.data?.data;
    const rows: OutstandingBeliItem[] = d?.items ?? [];
    obList.value.push(...rows);
    obTotal.value = d?.total ?? obTotal.value;
    obOffset.value += rows.length;
    if (rows.length < OB_PAGE_SIZE) obHasMore.value = false;
  } catch {
    obHasMore.value = false;
    loadFailed.Ob = true;
  } finally {
    if (myReq === obReqId) isLoadingMoreOb.value = false;
  }
};

const setupObObserver = () => {
  if (obScrollObserver) obScrollObserver.disconnect();
  if (!obSentinelEl.value) return;
  obScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreOb();
    },
    { threshold: 0.1 },
  );
  obScrollObserver.observe(obSentinelEl.value);
};

const resetOb = () => {
  obReqId++;
  obList.value = [];
  obTotal.value = 0;
  obOffset.value = 0;
  obHasMore.value = true;
  isLoadingMoreOb.value = false;
};

const loadPembelianData = async () => {
  if (!showPembelian.value) return;
  isLoadingPembelian.value = true;
  try {
    resetOb();
    const res = await dashboardService
      .getOutstandingBeliSummary()
      .catch(() => null);
    obSummary.value = res?.data?.data ?? {};
    await loadMoreOb();
    pembelianLoaded.value = true;
  } finally {
    isLoadingPembelian.value = false;
  }
};

watch(obTab, async () => {
  resetOb();
  await loadMoreOb();
  await nextTick();
  setupObObserver();
});

const isExportingOb = ref(false);

// Ambil semua baris satu tab; berhenti saat total tercapai (aman kalau
// server membatasi ukuran halaman)
const fetchAllOb = async (tab: string): Promise<OutstandingBeliItem[]> => {
  const all: OutstandingBeliItem[] = [];
  let offset = 0;
  while (true) {
    const res = await dashboardService.getOutstandingBeliList(tab, 200, offset);
    const d = res.data?.data;
    const rows: OutstandingBeliItem[] = d?.items ?? [];
    all.push(...rows);
    offset += rows.length;
    if (!rows.length || offset >= Number(d?.total ?? 0)) break;
  }
  return all;
};

const exportObExcel = async () => {
  isExportingOb.value = true;
  try {
    const hasil = await Promise.all(
      OB_TABS.map(async (t) => ({ tab: t, rows: await fetchAllOb(t.value) })),
    );
    if (!hasil.some((h) => h.rows.length)) {
      alert("Tidak ada data Outstanding Beli untuk diexport.");
      return;
    }

    const sheets = hasil.map(({ tab, rows }) => ({
      name: tab.label,
      columns: [
        { header: "No. Pengajuan", key: "nomor", width: 18 },
        { header: "Tgl Input", key: "tglInput", width: 18 },
        { header: "Peminta", key: "peminta", width: 20 },
        { header: "Item Barang", key: "item", width: 40 },
        { header: "Satuan", key: "satuan", width: 10 },
        {
          header: "Qty Minta",
          key: "qtyMinta",
          width: 12,
          numFmt: "#,##0",
          align: "right" as const,
        },
        {
          header: "Qty Beli",
          key: "qtyBeli",
          width: 12,
          numFmt: "#,##0",
          align: "right" as const,
        },
        {
          header: "Kekurangan",
          key: "kekurangan",
          width: 12,
          numFmt: "#,##0",
          align: "right" as const,
        },
        {
          header: "Waktu Tunggu (hari)",
          key: "waktuTunggu",
          width: 18,
          numFmt: "#,##0",
          align: "right" as const,
        },
      ],
      rows: rows.map((r) => ({
        nomor: r.Nomor,
        tglInput: r.TglInput,
        peminta: r.Peminta || "-",
        item: r.Item,
        satuan: r.Satuan,
        qtyMinta: Number(r.QtyMinta) || 0,
        qtyBeli: Number(r.QtyBeli) || 0,
        kekurangan: Number(r.Kekurangan) || 0,
        waktuTunggu: Number(r.WaktuTunggu) || 0,
      })),
    }));

    await exportExcelMulti(`Outstanding_Beli_${todayLocalStr()}.xlsx`, sheets);
  } catch (e: unknown) {
    alert(
      "Gagal export Outstanding Beli: " +
        (e instanceof Error ? e.message : String(e)),
    );
  } finally {
    isExportingOb.value = false;
  }
};

// ── Barang Jadi ──
const loadBarangJadiData = async () => {
  if (!showBarangJadi.value) return;
  stokBarangJadiList.value = [];
  stokBjOffset.value = 0;
  stokBjHasMore.value = true;
  mutasiBarangJadiList.value = [];
  mutasiBjOffset.value = 0;
  mutasiBjHasMore.value = true;

  isLoadingBarangJadi.value = true;
  try {
    const [metricRes] = await Promise.allSettled([
      dashboardService.getBarangJadiMetric(),
    ]);
    if (metricRes.status === "fulfilled" && metricRes.value?.data?.data)
      barangJadiMetric.value = metricRes.value.data.data;

    await Promise.allSettled([loadMoreStokBj(), loadMoreMutasiBj()]);

    barangJadiLoaded.value = true;
  } finally {
    isLoadingBarangJadi.value = false;
  }
};

// ── Refresh: reload tab yang lagi aktif aja, melewati simpanan server ──
const loadDashboard = async () => {
  await runFresh(async () => {
    if (activeTab.value === "overview") {
      await Promise.allSettled([loadOverviewData(), loadOverviewShortcuts()]);
    } else if (activeTab.value === "marketing") {
      marketingLoaded.value = false;
      await loadMarketingData();
    } else if (activeTab.value === "finance") {
      financeLoaded.value = false;
      await loadFinanceData();
    } else if (activeTab.value === "gudang") {
      gudangLoaded.value = false;
      await loadGudangData();
    } else if (activeTab.value === "gudang-bahan") {
      gudangBahanLoaded.value = false;
      await loadGudangBahanData();
    } else if (activeTab.value === "barang-jadi") {
      barangJadiLoaded.value = false;
      await loadBarangJadiData();
    } else if (activeTab.value === "pembelian") {
      pembelianLoaded.value = false;
      await loadPembelianData();
      await nextTick();
      setupObObserver();
    }
  });
};

const reloadMapPanels = async () => {
  if (isLoadingDashboard.value) return;
  isLoadingDashboard.value = true;
  mapSpkList.value = [];
  mapSpkOffset.value = 0;
  mapSpkHasMore.value = true;
  mapKirimList.value = [];
  mapKirimOffset.value = 0;
  mapKirimHasMore.value = true;
  gapCustomerList.value = [];
  pvrPage.value = 1;
  pvrHasMore.value = true;

  try {
    const [mapVsSpkRes, mapVsSjRes] = await Promise.allSettled([
      dashboardService.getMapVsSpkDashboard(mapRangeStart, mapRangeEnd),
      dashboardService.getMapVsSjDashboard(mapRangeStart, mapRangeEnd),
    ]);
    if (mapVsSpkRes.status === "fulfilled" && mapVsSpkRes.value?.data?.data) {
      mapSpkMetric.value = mapVsSpkRes.value.data.data.metric;
      mapDivisi.value = mapVsSpkRes.value.data.data.divisi;
    }
    if (mapVsSjRes.status === "fulfilled" && mapVsSjRes.value?.data?.data) {
      mapSjMetric.value = mapVsSjRes.value.data.data;
    }
    await Promise.allSettled([loadMoreMapSpk(), loadMoreMapKirim()]);
  } finally {
    isLoadingDashboard.value = false;
    await nextTick();
    setupMapSpkObserver();
    setupMapKirimObserver();
    await loadMorePvr();
    setupPvrObserver();
  }
};

onMounted(async () => {
  // Auto-select tab berdasarkan bagian user
  if (bagian.value === "PEMBELIAN") {
    activeTab.value = "pembelian";
  } else if (
    !showPenawaran.value &&
    !showPiutang.value &&
    !showGudangBahan.value &&
    showPoBpb.value
  ) {
    activeTab.value = "gudang";
  } else if (
    !showPenawaran.value &&
    showPiutang.value &&
    !showPoBpb.value &&
    !showGudangBahan.value
  ) {
    activeTab.value = "finance";
  } else if (
    showPenawaran.value &&
    !showPiutang.value &&
    !showPoBpb.value &&
    !showGudangBahan.value
  ) {
    activeTab.value = "marketing";
  } else if (
    !showPenawaran.value &&
    !showPiutang.value &&
    showGudangBahan.value
  ) {
    activeTab.value = "gudang-bahan";
  }

  // SPK Urgent, BAP Audit, Pra Order PPIC, dan BAP Reviewed ditampilkan
  // BERURUTAN, bukan bersamaan — masing-masing menyusul setelah dialog
  // sebelumnya ditutup (lihat closeSpkDialog / closeBapAuditDialog /
  // closePraOrderPpicDialog). Urutan: SPK -> BAP Audit -> Pra Order PPIC
  // -> BAP Reviewed.
  if (
    authStore.spkUrgent?.length > 0 &&
    !sessionStorage.getItem("hasSeenSpk")
  ) {
    isSpkDialogVisible.value = true;
  } else if (
    authStore.bapBaruAudit?.length > 0 &&
    !sessionStorage.getItem("hasSeenBapAudit")
  ) {
    isBapAuditDialogVisible.value = true;
  } else {
    showPraOrderPpicIfNeeded(); // ⬅ DIUBAH: dulu langsung showBapReviewedIfNeeded()
  }

  // Shortcut card butuh summary ringan dari tab lain; jalan paralel dengan overview
  void loadOverviewShortcuts();
  await loadOverviewData();

  startPolling();

  nowTickTimer = setInterval(() => {
    nowTick.value = Date.now();
  }, 30_000);

  // Tab non-overview dimuat oleh watcher(activeTab); di sini hanya overview
  await nextTick();
  if (activeTab.value === "overview") {
    setupAktObserver();
  }
});

onUnmounted(() => {
  stopPolling();
  if (nowTickTimer) clearInterval(nowTickTimer);
  aktScrollObserver?.disconnect();
  penScrollObserver?.disconnect();
  mapScrollObserver?.disconnect();
  overdueScrollObserver?.disconnect();
  bufferScrollObserver?.disconnect();
  bahanScrollObserver?.disconnect();
  rpDetailScrollObserver?.disconnect();
  mapSpkScrollObserver?.disconnect();
  mapKirimScrollObserver?.disconnect();
  bahanKurangScrollObserver?.disconnect();
  spkBelumMkbScrollObserver?.disconnect();
  outstandingScrollObserver?.disconnect();
  efisiensiScrollObserver?.disconnect();
  stokAccVsMkaScrollObserver?.disconnect();
  stokBjScrollObserver?.disconnect();
  mutasiBjScrollObserver?.disconnect();
  spkStbjScrollObserver?.disconnect();
  spkSjScrollObserver?.disconnect();
  spkTagihScrollObserver?.disconnect();
  pvrScrollObserver?.disconnect();
  mspScrollObserver?.disconnect();
  pbrScrollObserver?.disconnect();
  pbdScrollObserver?.disconnect();
  gbMkbScrollObserver?.disconnect();
  gbMkaScrollObserver?.disconnect();
  sbScrollObserver?.disconnect();
  bkScrollObserver?.disconnect();
  pbBatalScrollObserver?.disconnect();
  potensiScrollObserver?.disconnect();
  potensiBatalScrollObserver?.disconnect();
  obScrollObserver?.disconnect();
  inkasoBatalScrollObserver?.disconnect();
});

const closeSpkDialog = () => {
  isSpkDialogVisible.value = false;
  sessionStorage.setItem("hasSeenSpk", "true");
  if (
    authStore.bapBaruAudit?.length > 0 &&
    !sessionStorage.getItem("hasSeenBapAudit")
  ) {
    isBapAuditDialogVisible.value = true;
  } else {
    showPraOrderPpicIfNeeded();
  }
};

const closeBapAuditDialog = () => {
  isBapAuditDialogVisible.value = false;
  sessionStorage.setItem("hasSeenBapAudit", "true");
  showPraOrderPpicIfNeeded(); // ⬅ DIUBAH
};
const goToBapDetail = (nomor: string) => {
  closeBapAuditDialog();
  router.push(`/daftar/berita-acara/edit/${encodeURIComponent(nomor)}`);
};

// ⬅ BARU: dialog Pra Order PENDING konfirmasi PPIC — cuma untuk bagian
// PPIC (authStore.praOrderPendingPpic kosong buat bagian lain, sudah
// difilter di authService.js)
const showPraOrderPpicIfNeeded = () => {
  if (
    authStore.praOrderPendingPpic?.length > 0 &&
    !sessionStorage.getItem("hasSeenPraOrderPpic")
  ) {
    isPraOrderPpicDialogVisible.value = true;
  } else {
    showBapReviewedIfNeeded();
  }
};

const closePraOrderPpicDialog = () => {
  isPraOrderPpicDialogVisible.value = false;
  sessionStorage.setItem("hasSeenPraOrderPpic", "true");
  showBapReviewedIfNeeded();
};

const goToPraOrderPpicDetail = () => {
  closePraOrderPpicDialog();
  router.push("/ppic/konfirmasi-pra-order");
};

const showBapReviewedIfNeeded = () => {
  if (
    authStore.bapReviewedNotif?.length > 0 &&
    !sessionStorage.getItem("hasSeenBapReviewed")
  ) {
    hasReadBapReviewed.value = false;
    isBapReviewedDialogVisible.value = true;
  }
};

const closeBapReviewedDialog = async () => {
  if (!hasReadBapReviewed.value) return; // guard tambahan, tombol juga disabled
  try {
    const nomorList = authStore.bapReviewedNotif.map((b) => b.Nomor);
    await api.post("/master/bap-produksi-form/reviewed/dibaca", { nomorList });
  } catch {
    /* silent — tetap tutup dialog walau gagal tandai, supaya user tidak macet */
  }
  isBapReviewedDialogVisible.value = false;
  sessionStorage.setItem("hasSeenBapReviewed", "true");
};

const goToBapDetailFromReviewed = (nomor: string) => {
  router.push(`/daftar/berita-acara/edit/${encodeURIComponent(nomor)}`);
};

const goToKunjunganDetail = (namaSales?: string) => {
  const query: Record<string, string> = {};
  if (namaSales) query.sales = namaSales;
  router.push({ path: "/laporan/marketing/kunjungan-sales", query });
};

// ── Computed helpers ──
const konversiRate = computed(() => {
  if (!penSummary.value.TotalPenawaran) return 0;
  return Math.round(
    (penSummary.value.SudahSpk / penSummary.value.TotalPenawaran) * 100,
  );
});
const umurClass = (hari: number) => {
  if (hari >= 14) return "umur-danger";
  if (hari >= 7) return "umur-warn";
  return "umur-ok";
};
// const totalNominal = computed(() =>
//   realisasiRows.value.reduce((s, r) => s + Number(r.Nominal || 0), 0),
// );
// const totalClose = computed(() =>
//   realisasiRows.value.reduce((s, r) => s + Number(r.Close || 0), 0),
// );
// const pctGlobal = computed(() =>
//   totalNominal.value
//     ? Math.round((totalClose.value / totalNominal.value) * 100)
//     : 0,
// );
// const barPct = (nominal: number, close: number, batal: number) => ({
//   close: nominal ? Math.round((close / nominal) * 100) : 0,
//   batal: nominal ? Math.round((batal / nominal) * 100) : 0,
//   open: nominal ? Math.round(((nominal - close - batal) / nominal) * 100) : 0,
// });
const shortNum = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "M";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "rb";
  return String(n);
};
const KATEGORI_LABEL: Record<string, string> = {
  CEPAT: "Cepat ≤7hr",
  NORMAL: "Normal 8-14hr",
  LAMBAT: "Lambat 15-30hr",
  SANGAT_LAMBAT: ">30hr",
  BELUM: "Belum",
  BATAL: "Batal",
  CLOSE: "Close",
};
const KATEGORI_COLOR: Record<string, string> = {
  CEPAT: C.good,
  NORMAL: C.accent,
  LAMBAT: C.warn,
  SANGAT_LAMBAT: C.bad,
  BELUM: C.track,
  BATAL: C.neutral,
  CLOSE: C.slate,
};
const BULAN_LABEL = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const formatBulanLabel = (bulan: string) => {
  const [y, m] = bulan.split("-").map(Number);
  return `${BULAN_LABEL[m - 1]} '${String(y).slice(2)}`;
};
const rpSegPct = (m: RealisasiBulananMonth, status: string) => {
  if (!m.totalNilai) return 0;
  const v = m.statuses[status]?.Nilai || 0;
  return Math.round((v / m.totalNilai) * 100);
};
const shortNumID = (n: number) => shortNum(n).replace(".", ",");
const calcYoyPct = (aktual: number, ly: number): number => {
  if (!ly) return aktual > 0 ? 100 : 0;
  return ((aktual - ly) / ly) * 100;
};
const bufferPct = (stok: number, buffer: number): number => {
  if (!buffer) return 100;
  return Math.min(100, Math.round((stok / buffer) * 100));
};

const bufferColor = (pct: number): string => {
  if (pct < 20) return C.bad;
  if (pct < 50) return C.warn;
  return C.good;
};

// Persentase per bucket
const realisasiPct = computed(() => {
  const total = realisasiPenawaranData.value.metric.TotalPenawaran || 1;
  const m = realisasiPenawaranData.value.metric;
  return {
    cepat: Math.round((m.KonversiCepat / total) * 100),
    normal: Math.round((m.KonversiNormal / total) * 100),
    lambat: Math.round((m.KonversiLambat / total) * 100),
    sangatLambat: Math.round((m.KonversiSangatLambat / total) * 100),
    batal: Math.round((m.Batal / total) * 100),
    belum: Math.round((m.BelumKonversi / total) * 100),
  };
});
// ── Collection rate bulan ini ──
const collectionRate = computed(() => {
  const debet = piutangData.value.summary.TotalDebet || 0;
  const kredit = piutangData.value.summary.TotalKredit || 0;
  if (!debet) return 0;
  return Math.min(100, Math.round((kredit / debet) * 100));
});

const collectionRateColor = computed(() => {
  if (collectionRate.value >= 80) return C.good;
  if (collectionRate.value >= 50) return C.warn;
  return C.bad;
});

// ── Aging bucket dari overdueList ──
const agingBuckets = computed(() => {
  const b = { a: 0, b: 0, c: 0, d: 0 }; // 1-30, 31-60, 61-90, >90
  overdueList.value.forEach((inv) => {
    const h = inv.TerlambatHari;
    if (h <= 30) b.a++;
    else if (h <= 60) b.b++;
    else if (h <= 90) b.c++;
    else b.d++;
  });
  return b;
});

const agingNominal = computed(() => {
  const n = { a: 0, b: 0, c: 0, d: 0 };
  overdueList.value.forEach((inv) => {
    const h = inv.TerlambatHari;
    const v = Number(inv.SisaTagihan) || 0;
    if (h <= 30) n.a += v;
    else if (h <= 60) n.b += v;
    else if (h <= 90) n.c += v;
    else n.d += v;
  });
  return n;
});

// ── Dialog SPK helpers ──
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split("-").map(Number);
  if (parts[2] > 1000) return new Date(parts[0], parts[1] - 1, parts[2]);
  return new Date(parts[2], parts[1] - 1, parts[0]);
};
const isOverdue = (dateline: string) => {
  const dl = parseDate(dateline);
  if (!dl) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dl < today;
};
const isToday = (dateline: string) => {
  const dl = parseDate(dateline);
  if (!dl) return false;
  return dl.toDateString() === new Date().toDateString();
};
const sisa = (item: any) => (item.QtyOrder ?? 0) - (item.QtyJadi ?? 0);
const sisaClass = (item: any) => {
  const s = sisa(item);
  if (s > 0) return "val-danger";
  if (s === 0) return "val-done";
  return "val-warn";
};
</script>

<template>
  <v-container fluid class="pa-3 dsh-root">
    <!-- ── Header ── -->
    <div
      class="manksi-panel header-panel mb-3 d-flex justify-space-between align-center"
    >
      <div>
        <div
          class="text-primary font-weight-bold"
          style="font-size: 13px; margin-bottom: 2px"
        >
          DASHBOARD MANKSI
        </div>
        <div class="text-grey-darken-2" style="font-size: 12px">
          Selamat datang kembali,
          <strong>{{ authStore.userName }}</strong>
          ({{ authStore.userCabang }})
        </div>
      </div>
      <div class="d-flex align-center" style="gap: 8px">
        <span
          v-if="refreshLabel"
          class="dsh-updated"
          :class="{ 'dsh-updated--busy': pendingSnaps > 0 }"
          role="status"
        >
          {{ refreshLabel }}
        </span>
        <v-btn
          icon
          variant="text"
          size="small"
          :loading="isLoadingDashboard"
          title="Refresh Dashboard"
          aria-label="Refresh dashboard"
          @click="loadDashboard"
        >
          <IconRefresh :size="16" :stroke-width="1.7" />
        </v-btn>

        <div class="text-right text-grey-darken-2" style="font-size: 12px">
          <div>
            Bagian:
            <strong class="text-black">{{
              authStore.user?.bagian || "-"
            }}</strong>
          </div>
          <div>
            Gudang Jadi:
            <strong class="text-black">{{
              authStore.gudangJadi?.nama || "-"
            }}</strong>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Tab Navigation ── -->
    <v-tabs
      v-model="activeTab"
      color="primary"
      density="compact"
      class="mb-3"
      bg-color="white"
      style="
        border: 1px solid var(--dsh-line);
        border-radius: var(--dsh-radius);
        box-shadow: var(--dsh-shadow);
      "
    >
      <v-tab value="overview" class="text-caption font-weight-bold">
        <IconLayoutDashboard :size="14" class="mr-1" :stroke-width="1.7" />
        Overview
      </v-tab>
      <v-tab
        v-if="showPenawaran"
        value="marketing"
        class="text-caption font-weight-bold"
      >
        <IconChartBar :size="14" class="mr-1" :stroke-width="1.7" />
        Marketing
      </v-tab>
      <v-tab
        v-if="showPiutang"
        value="finance"
        class="text-caption font-weight-bold"
      >
        <IconCoin :size="14" class="mr-1" :stroke-width="1.7" />
        Finance / Piutang
      </v-tab>
      <v-tab
        v-if="showPoBpb"
        value="gudang"
        class="text-caption font-weight-bold"
      >
        <IconTruckDelivery :size="14" class="mr-1" :stroke-width="1.7" />
        Gudang Garmen
      </v-tab>
      <v-tab
        v-if="showGudangBahan"
        value="gudang-bahan"
        class="text-caption font-weight-bold"
      >
        <IconPackage :size="14" class="mr-1" :stroke-width="1.7" />
        Gudang Bahan
      </v-tab>
      <v-tab
        v-if="showBarangJadi"
        value="barang-jadi"
        class="text-caption font-weight-bold"
      >
        <IconBoxSeam :size="14" class="mr-1" :stroke-width="1.7" />
        Barang Jadi
      </v-tab>
      <v-tab
        v-if="showPembelian"
        value="pembelian"
        class="text-caption font-weight-bold"
      >
        <IconShoppingCart :size="14" class="mr-1" :stroke-width="1.7" />
        Pembelian
      </v-tab>
    </v-tabs>

    <div v-if="failedPanelLabels.length" class="dsh-banner" role="alert">
      <IconAlertTriangle :size="16" :stroke-width="1.7" />
      <div class="dsh-banner-text">
        <strong>Sebagian data gagal dimuat:</strong>
        {{ failedPanelLabels.join(", ") }}. Panel yang tampak kosong belum tentu
        benar-benar kosong.
      </div>
      <button type="button" class="dsh-banner-btn" @click="loadDashboard">
        Muat ulang tab
      </button>
    </div>

    <v-window v-model="activeTab">
      <!-- ════════════════════════════════════════
           TAB OVERVIEW
      ════════════════════════════════════════ -->
      <v-window-item value="overview">
        <v-row v-if="showCompanyPulse" dense class="mb-3">
          <v-col cols="12">
            <div
              class="manksi-panel d-flex flex-wrap align-center"
              style="
                padding: 10px 16px;
                gap: 0;
                border-left: 4px solid var(--dsh-accent);
              "
            >
              <div class="pen-stat" style="padding: 0 20px">
                <span class="pen-stat-val text-primary" style="font-size: 18px">
                  {{
                    isLoadingDashboard ? "—" : shortNum(companyPulse.revenueMtd)
                  }}
                </span>
                <span class="pen-stat-lbl">Revenue MTD</span>
              </div>
              <div class="po-bpb-divider" />
              <div class="pen-stat" style="padding: 0 20px">
                <span class="pen-stat-val text-error" style="font-size: 18px">
                  {{
                    isLoadingDashboard
                      ? "—"
                      : shortNum(companyPulse.outstandingAr)
                  }}
                </span>
                <span class="pen-stat-lbl">Outstanding AR</span>
              </div>
              <div class="po-bpb-divider" />
              <div class="pen-stat" style="padding: 0 20px">
                <span
                  class="pen-stat-val"
                  style="font-size: 18px; color: var(--dsh-warn)"
                >
                  {{
                    isLoadingDashboard ? "—" : companyPulse.approvalPendingTotal
                  }}
                </span>
                <span class="pen-stat-lbl">Approval Pending</span>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row v-if="showSaldoKas" dense class="mb-3">
          <v-col cols="12">
            <div
              class="saldo-kas-card"
              :class="
                saldoKas.Saldo < 0
                  ? 'saldo-kas-card--neg'
                  : 'saldo-kas-card--pos'
              "
            >
              <div class="saldo-kas-icon-wrap">
                <IconCoin :size="22" :stroke-width="1.7" />
              </div>
              <div class="saldo-kas-main">
                <div class="saldo-kas-val">
                  {{ isLoadingDashboard ? "—" : fmtNum(saldoKas.Saldo) }}
                </div>
                <div class="saldo-kas-lbl">
                  Saldo Kas ({{ saldoKas.Cabang || cabang }})
                </div>
              </div>
              <div class="saldo-kas-divider" />
              <div class="saldo-kas-sub">
                <div class="saldo-kas-sub-val">
                  {{ isLoadingDashboard ? "—" : saldoKas.JumlahRekening }}
                </div>
                <div class="saldo-kas-sub-lbl">Jml Rekening Kas</div>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- SPK Summary Cards -->
        <v-row dense class="mb-3">
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">SPK Aktif</div>
              <div class="sum-value text-primary">
                {{ isLoadingDashboard ? "—" : animatedSpkAktif }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Terlambat</div>
              <div class="sum-value text-error">
                {{ isLoadingDashboard ? "—" : animatedTerlambat }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Deadline Hari Ini</div>
              <div class="sum-value text-warning">
                {{ isLoadingDashboard ? "—" : animatedDeadlineHariIni }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Segera Deadline (≤3hr)</div>
              <div class="sum-value" style="color: var(--dsh-warn)">
                {{ isLoadingDashboard ? "—" : animatedSegera }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- SO Summary Cards -->
        <v-row dense class="mb-3">
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">SO Aktif</div>
              <div class="sum-value text-primary">
                {{ isLoadingDashboard ? "—" : soSummary.TotalAktif }}
              </div>
              <div
                v-if="!isLoadingDashboard && soAktifTrend.delta !== null"
                class="sum-sub"
                :style="{
                  color:
                    soAktifTrend.delta >= 0
                      ? 'var(--dsh-good)'
                      : 'var(--dsh-bad)',
                  fontWeight: 600,
                }"
              >
                {{ soAktifTrend.delta >= 0 ? "▲" : "▼" }}
                {{ Math.abs(soAktifTrend.delta) }}% vs minggu lalu
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Belum Dibuatkan SPK</div>
              <div class="sum-value text-error">
                {{ isLoadingDashboard ? "—" : soSummary.BelumSpk }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Belum Kirim</div>
              <div class="sum-value text-warning">
                {{ isLoadingDashboard ? "—" : soSummary.BelumKirim }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Belum Jadi</div>
              <div class="sum-value" style="color: var(--dsh-warn)">
                {{ isLoadingDashboard ? "—" : soSummary.BelumJadi }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Shortcut cards ke tab lain -->
        <v-row dense>
          <v-col v-if="showPenawaran" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'marketing'">
              <IconChartBar :size="20" :stroke-width="1.5" />
              <div style="flex: 1; min-width: 0">
                <div class="shortcut-title">Marketing</div>
                <div class="shortcut-sub">
                  <span v-if="isLoadingDashboard">Memuat...</span>
                  <span v-else>
                    {{ penSummary.BelumSpk }} penawaran belum SO ·
                    {{ mapSummary.BelumMAP }} belum MAP
                  </span>
                </div>
              </div>
              <IconChevronRight :size="16" />
            </div>
          </v-col>
          <v-col v-if="showPiutang" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'finance'">
              <IconCoin :size="20" :stroke-width="1.5" />
              <div style="flex: 1; min-width: 0">
                <div class="shortcut-title">Finance / Piutang</div>
                <div class="shortcut-sub">
                  <span v-if="isLoadingDashboard">Memuat...</span>
                  <span v-else>
                    {{ piutangData.summary.overdueTotal }} invoice overdue ·
                    Outstanding
                    {{ shortNum(piutangData.summary.TotalOutstanding) }}
                  </span>
                </div>
              </div>
              <IconChevronRight :size="16" />
            </div>
          </v-col>
          <v-col v-if="showGudangBahan" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'gudang-bahan'">
              <IconPackage :size="20" :stroke-width="1.5" />
              <div style="flex: 1; min-width: 0">
                <div class="shortcut-title">Gudang Bahan</div>
                <div class="shortcut-sub">
                  <span v-if="isLoadingDashboard || isLoadingGudangBahan"
                    >Memuat...</span
                  >
                  <span v-else>
                    {{ gudangBahanData.metric.JmlBawahBuffer }} item bawah
                    buffer · {{ gudangBahanData.metric.JmlMinus }} barcode minus
                  </span>
                </div>
              </div>
              <IconChevronRight :size="16" />
            </div>
          </v-col>
          <v-col v-if="showPoBpb" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'gudang'">
              <IconTruckDelivery
                :size="20"
                color="var(--dsh-accent)"
                :stroke-width="1.5"
              />
              <div style="flex: 1; min-width: 0">
                <div class="shortcut-title">Gudang Garmen</div>
                <div class="shortcut-sub">
                  <span v-if="isLoadingDashboard">Memuat...</span>
                  <span v-else>
                    {{ spkVsStbjSummary.BelumStbj }} SPK belum STBJ ·
                    {{
                      spkVsSjSummary.BelumKirim + spkVsSjSummary.SebagianKirim
                    }}
                    belum lunas kirim
                  </span>
                </div>
              </div>
              <IconChevronRight :size="16" />
            </div>
          </v-col>
          <v-col v-if="showBarangJadi" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'barang-jadi'">
              <IconBoxSeam :size="20" :stroke-width="1.5" />
              <div style="flex: 1; min-width: 0">
                <div class="shortcut-title">Barang Jadi</div>
                <div class="shortcut-sub">
                  <span v-if="isLoadingDashboard || isLoadingBarangJadi"
                    >Memuat...</span
                  >
                  <span v-else>
                    {{ fmtNum(barangJadiMetric.TotalStok) }} stok ·
                    {{ barangJadiMetric.ItemMinus }} minus
                  </span>
                </div>
              </div>
              <IconChevronRight :size="16" />
            </div>
          </v-col>
          <v-col v-if="showPembelian" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'pembelian'">
              <IconShoppingCart
                :size="20"
                color="var(--dsh-warn)"
                :stroke-width="1.5"
              />
              <div style="flex: 1; min-width: 0">
                <div class="shortcut-title">Pembelian</div>
                <div class="shortcut-sub">
                  <span v-if="isLoadingDashboard">Memuat...</span>
                  <span v-else>
                    {{ obTotalAll }} item outstanding beli ·
                    {{ obSummary.PENGAJUAN_DANA || 0 }} dari pengajuan dana
                  </span>
                </div>
              </div>
              <IconChevronRight :size="16" />
            </div>
          </v-col>
        </v-row>

        <v-row v-if="showPoBpb" dense class="mt-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header">
                <IconTrendingUp :size="14" :stroke-width="1.7" class="mr-1" />
                Alur produksi bulan ini
                <button
                  type="button"
                  class="po-bpb-link ml-auto"
                  @click="activeTab = 'gudang'"
                >
                  Lihat rincian
                </button>
              </div>
              <div class="panel-body">
                <DashState v-if="!flowReady" kind="loading" :rows="2" />
                <ProductionFlow
                  v-else-if="pipelineData.TotalMasuk"
                  :stages="productionFlowStages"
                  compact
                />
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada SPK dengan dateline pada periode ini."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row 3: Trend Chart + Aktivitas Hari Ini ── -->
        <v-row dense class="mt-2">
          <!-- Trend 7 Hari -->
          <v-col cols="12" md="5">
            <div
              class="manksi-panel"
              style="height: 280px; display: flex; flex-direction: column"
            >
              <div class="panel-header">
                <IconTrendingUp
                  :size="14"
                  style="color: var(--dsh-accent)"
                  class="mr-1"
                />
                <span>Trend 7 Hari Terakhir</span>
              </div>
              <div
                style="
                  flex: 1;
                  min-height: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                "
              >
                <div v-if="!trendData.length" class="empty-hint">
                  Memuat data...
                </div>
                <div v-else ref="trendChartEl" style="width: 100%" />
              </div>
            </div>
          </v-col>

          <!-- Aktivitas Hari Ini -->
          <v-col cols="12" md="7">
            <div
              class="manksi-panel"
              style="height: 280px; display: flex; flex-direction: column"
            >
              <div class="panel-header">
                <IconActivity
                  :size="14"
                  style="color: var(--dsh-accent)"
                  class="mr-1"
                />
                <span>Aktivitas Hari Ini</span>
                <span class="ms-auto text-caption text-medium-emphasis">
                  {{ animatedAktivitasCount
                  }}{{ aktHasMore ? "+" : "" }} transaksi
                </span>
              </div>
              <div style="flex: 1; overflow-y: auto">
                <div
                  v-if="!aktivitasList.length && !isLoadingMoreAkt"
                  class="empty-hint"
                >
                  Belum ada aktivitas hari ini
                </div>
                <div v-else class="aktivitas-list">
                  <div
                    v-for="(item, i) in aktivitasList"
                    :key="i"
                    class="aktivitas-item"
                    :class="{
                      'aktivitas-item--new': newAktivitasIds.has(item.nomor),
                    }"
                  >
                    <span
                      class="jenis-badge"
                      :style="{
                        background: jenisColor[item.jenis] + '18',
                        color: jenisColor[item.jenis],
                      }"
                    >
                      {{ item.jenis }}
                    </span>
                    <span class="akt-nomor">{{ item.nomor }}</span>
                    <span class="akt-nama">{{ item.nama }}</span>
                    <span class="akt-divisi">{{ item.divisi }}</span>
                    <span class="akt-jam ms-auto">{{ item.jam }}</span>
                  </div>

                  <!-- Sentinel -->
                  <div
                    ref="aktSentinelEl"
                    style="padding: 6px; text-align: center"
                  >
                    <span v-if="isLoadingMoreAkt" class="pen-loading"
                      >Memuat...</span
                    >
                    <span
                      v-else-if="!aktHasMore && aktivitasList.length"
                      class="pen-end"
                    >
                      {{ aktivitasList.length }} aktivitas
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ════════════════════════════════════════
           TAB MARKETING
      ════════════════════════════════════════ -->
      <v-window-item value="marketing">
        <!-- ── Row 5: Achievement Ringkas + Growth YoY ── -->
        <v-row dense class="mt-2">
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--blue">
                <IconGauge :size="14" :stroke-width="1.7" class="mr-1" />
                Achievement Ringkas
                <span class="panel-header-sub ml-1">(bulan ini)</span>
                <span
                  v-if="achievementData.totalTarget"
                  class="ml-auto pct-badge"
                  :class="
                    achievementData.totalAch >= 100
                      ? 'pct-good'
                      : achievementData.totalAch >= 70
                        ? 'pct-mid'
                        : 'pct-low'
                  "
                >
                  {{ Math.round(achievementData.totalAch) }}% ach
                </span>
              </div>
              <div
                class="panel-body"
                style="display: flex; flex-direction: column; height: 100%"
              >
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else-if="achievementData.byDivisi.length">
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-primary">{{
                        shortNum(achievementData.totalTarget)
                      }}</span>
                      <span class="pen-stat-lbl">Target</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-success">{{
                        shortNum(achievementData.totalRealisasi)
                      }}</span>
                      <span class="pen-stat-lbl">Realisasi</span>
                    </div>
                  </div>
                  <div style="padding: 8px 12px">
                    <div ref="achChartEl" style="width: 100%" />
                  </div>
                  <div
                    v-if="achievementData.topSales.length"
                    style="
                      border-top: 1px solid var(--dsh-fill);
                      padding: 5px 12px 0;
                      font-size: 10px;
                      color: var(--dsh-ink-3);
                      font-weight: 600;
                    "
                  >
                    TOP 5 SALES (% ACHIEVEMENT)
                  </div>
                  <div
                    v-if="achievementData.topSales.length"
                    style="padding: 4px 12px 8px"
                  >
                    <div ref="achTopSalesChartEl" style="width: 100%" />
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data target/achievement bulan ini."
                />
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--green">
                <IconTrendingUp :size="14" :stroke-width="1.7" class="mr-1" />
                Growth YoY
                <span class="panel-header-sub ml-1">(12 bulan)</span>
                <span
                  v-if="growthVsTargetStatus"
                  class="pct-badge ml-auto"
                  :style="{
                    background: growthVsTargetStatus.bg,
                    color: growthVsTargetStatus.color,
                  }"
                >
                  {{ growthVsTargetStatus.label }}
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else-if="growthYoyData.length">
                  <div class="gb-list gyy-list">
                    <div
                      v-for="row in growthYoyWithAch"
                      :key="row.bulan"
                      class="gyy-row"
                    >
                      <div class="gyy-col-bulan">{{ row.namaBulan }}</div>
                      <div class="gyy-col-aktual">
                        {{ shortNum(row.aktual) }} vs LY {{ shortNum(row.ly) }}
                      </div>
                      <div
                        class="gyy-col-yoy"
                        :style="{
                          color:
                            calcYoyPct(row.aktual, row.ly) >= 0
                              ? 'var(--dsh-good)'
                              : 'var(--dsh-bad)',
                        }"
                      >
                        {{ calcYoyPct(row.aktual, row.ly) >= 0 ? "+" : ""
                        }}{{ fmtDec(calcYoyPct(row.aktual, row.ly), 1) }}%
                      </div>
                      <div class="gyy-col-ach">
                        <span
                          v-if="row.achInfo"
                          class="gyy-ach-badge"
                          :style="{
                            color:
                              row.achInfo.ach >= 100
                                ? 'var(--dsh-good)'
                                : 'var(--dsh-bad)',
                            background:
                              row.achInfo.ach >= 100
                                ? 'var(--dsh-good-soft)'
                                : 'var(--dsh-bad-soft)',
                          }"
                        >
                          Ach {{ Math.round(row.achInfo.ach) }}%
                        </span>
                        <span v-else class="gyy-ach-badge gyy-ach-badge--none"
                          >—</span
                        >
                      </div>
                      <div class="gyy-col-target">
                        <template v-if="row.achInfo">
                          {{ shortNumID(row.achInfo.realisasi) }} vs
                          {{ shortNumID(row.achInfo.target) }}
                        </template>
                      </div>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data growth YoY."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mt-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--green">
                <IconCoin :size="14" :stroke-width="1.7" class="mr-1" />
                Target Collection
                <span v-if="targetCollectionData" class="panel-header-sub ml-1">
                  (target = omzet {{ targetCollectionData.targetBulanLabel }} +
                  piutang lama belum lunas)
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingTargetCollection" kind="loading" />
                <template v-else-if="targetCollectionData">
                  <div style="overflow-x: auto">
                    <table class="gb-tbl" style="min-width: 1040px">
                      <thead>
                        <tr>
                          <th>Sales</th>
                          <th class="tr">Target Omzet</th>
                          <th
                            class="tr"
                            title="Sisa piutang invoice bulan target saat ini"
                          >
                            Piutang Saat Ini
                          </th>
                          <th
                            class="tr"
                            title="Sisa piutang invoice sebelum bulan target, per akhir bulan lalu"
                          >
                            Target Piutang Lama
                          </th>
                          <th class="tr">Total Target</th>
                          <th class="tr">Collection Bulan Ini</th>
                          <th class="tr">% MTD</th>
                          <th class="tr">% YTD</th>
                          <th
                            class="tr"
                            title="Seluruh sisa piutang all-time per sales, per hari ini"
                          >
                            Piutang Real-Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="row in targetCollectionData.items"
                          :key="row.salKode"
                        >
                          <td>
                            <span
                              class="td-sales-link"
                              @click="openTargetDetail(row)"
                            >
                              {{ row.namaSales }}
                            </span>
                          </td>
                          <td class="tr">{{ fmtNum(row.targetBulanIni) }}</td>
                          <td class="tr">{{ fmtNum(row.piutangSaatIni) }}</td>
                          <td class="tr">
                            {{ fmtNum(row.targetPiutangLama) }}
                          </td>
                          <td class="tr" style="font-weight: 600">
                            {{ fmtNum(row.targetTotal) }}
                          </td>
                          <td
                            class="tr"
                            :style="{
                              color:
                                row.sisaCollectionMtd > 0
                                  ? 'var(--dsh-bad)'
                                  : 'var(--dsh-good)',
                              fontWeight: 600,
                            }"
                          >
                            {{ fmtNum(row.collectionMtd) }}
                          </td>
                          <td class="tr">{{ fmtPct(row.pctCollectionMtd) }}</td>
                          <td class="tr">{{ fmtPct(row.pctCollectionYtd) }}</td>
                          <td
                            class="tr"
                            :style="{
                              color:
                                row.piutangRealtime > 0
                                  ? 'var(--dsh-bad)'
                                  : undefined,
                            }"
                          >
                            {{ fmtNum(row.piutangRealtime) }}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="rp-total-row">
                          <td style="font-weight: 700">GRAND TOTAL</td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.targetBulanIni,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.piutangSaatIni,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal
                                  .targetPiutangLama,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.targetTotal,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.collectionMtd,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtPct(
                                targetCollectionData.grandTotal
                                  .pctCollectionMtd,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtPct(
                                targetCollectionData.grandTotal
                                  .pctCollectionYtd,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.piutangRealtime,
                              )
                            }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <!-- ── Strip chip bulan ── -->
                  <div class="tc-month-strip">
                    <button
                      v-for="m in targetCollectionMonthChips"
                      :key="m.key"
                      class="tc-month-chip"
                      :class="{
                        'tc-month-chip--active':
                          m.key === selectedTargetCollectionKey,
                      }"
                      @click="fetchTargetCollection(m.bulan, m.tahun)"
                    >
                      {{ m.label }}
                    </button>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data target collection."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row 1: 3 panel sejajar ── -->
        <v-row dense class="mb-2">
          <!-- Penawaran Belum MAP -->
          <v-col cols="12" md="5">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--orange">
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Penawaran Belum MAP
                <span
                  v-if="mapSummary.BelumMAPAdaClose"
                  class="badge-count ml-1"
                  style="background: var(--dsh-warn)"
                >
                  {{ mapSummary.BelumMAPAdaClose }} perlu perhatian
                </span>
                <span
                  class="ml-auto d-flex align-center"
                  style="gap: 8px; font-size: 11px"
                >
                  <span
                    >Total: <b>{{ mapSummary.TotalPenawaran }}</b> item</span
                  >
                  <span style="color: var(--dsh-good)"
                    >Sudah MAP: <b>{{ mapSummary.SudahMAP }}</b></span
                  >
                  <span style="color: var(--dsh-bad)"
                    >Belum MAP: <b>{{ mapSummary.BelumMAP }}</b></span
                  >
                  <span style="color: var(--dsh-ink-2)"
                    >Close: <b>{{ mapSummary.Close || "-" }}</b></span
                  >
                  <span style="color: var(--dsh-ink-3)"
                    >Batal: <b>{{ mapSummary.Batal || "-" }}</b></span
                  >
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template
                  v-else-if="penawaranBelumMap.length || isLoadingMoreMap"
                >
                  <div class="map-list">
                    <div
                      v-for="p in penawaranBelumMap"
                      :key="p.Nomor"
                      class="map-item"
                      :class="
                        p.UmurHari >= 14
                          ? 'map-danger'
                          : p.UmurHari >= 7
                            ? 'map-warn'
                            : ''
                      "
                      style="cursor: pointer"
                      @click="
                        router.push(
                          `/penjualan/penawaran/edit/${encodeURIComponent(p.Nomor)}`,
                        )
                      "
                    >
                      <div class="map-item-top">
                        <span class="map-nomor">{{ p.Nomor }}</span>
                        <div class="d-flex align-center" style="gap: 5px">
                          <span
                            class="map-close-badge"
                            style="
                              background: var(--dsh-good-soft);
                              color: var(--dsh-good);
                            "
                          >
                            {{ p.JmlItem }} item
                          </span>
                          <span class="pen-age" :class="umurClass(p.UmurHari)"
                            >{{ p.UmurHari }}h</span
                          >
                        </div>
                      </div>
                      <div class="map-cus">{{ p.NamaCustomer }}</div>
                      <div v-if="p.Keterangan" class="pen-ket">
                        {{ p.Keterangan }}
                      </div>
                    </div>
                    <div
                      ref="mapSentinelEl"
                      style="
                        width: 100%;
                        padding: 8px;
                        text-align: center;
                        flex-basis: 100%;
                      "
                    >
                      <span v-if="isLoadingMoreMap" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!mapHasMore && penawaranBelumMap.length"
                        class="pen-end"
                      >
                        {{ penawaranBelumMap.length }} penawaran
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else-if="loadFailed.Map"
                  kind="error"
                  message="Penawaran belum MAP gagal dimuat."
                  @retry="loadMoreMap"
                />
                <div v-else class="text-center text-grey py-3 text-caption">
                  Semua penawaran sudah ada MAP-nya
                </div>
              </div>
            </div>
          </v-col>

          <!-- Penawaran Batal — DIPINDAH ke sini, jadi kolom baru -->
          <v-col cols="12" md="3">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-line);
                  color: var(--dsh-ink-2);
                  border-bottom: 1px solid var(--dsh-line);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Penawaran Batal
                <span class="panel-header-sub ml-1">(90 hari)</span>
                <span
                  v-if="penawaranBatalSummary.total"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-ink-2)"
                >
                  {{ penawaranBatalSummary.total }}
                </span>
              </div>
              <div class="panel-body">
                <template
                  v-if="penawaranBatalList.length || isLoadingMorePbBatal"
                >
                  <div class="pen-list" style="max-height: 320px">
                    <div
                      v-for="(item, i) in penawaranBatalList"
                      :key="i"
                      class="pen-item"
                      style="cursor: pointer"
                      @click="
                        router.push(
                          `/penjualan/penawaran/edit/${encodeURIComponent(item.Nomor)}`,
                        )
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ item.Nomor }}</span>
                        <span class="pen-divisi">{{ item.UmurHari }}h</span>
                      </div>
                      <div class="pen-cus">{{ item.NamaCustomer }}</div>
                      <div class="pen-ket">{{ item.NamaBarang }}</div>
                      <div
                        v-if="item.AlasanBatal"
                        style="
                          font-size: 10px;
                          font-style: italic;
                          color: var(--dsh-bad);
                          margin-top: 2px;
                        "
                      >
                        {{ item.AlasanBatal }}
                      </div>
                    </div>
                    <div ref="pbBatalSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMorePbBatal" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!pbBatalHasMore && penawaranBatalList.length"
                        class="pen-end"
                      >
                        {{ penawaranBatalList.length }} penawaran batal
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Tidak ada penawaran batal 90 hari terakhir"
                />
              </div>
            </div>
          </v-col>

          <!-- Penawaran Belum SPK -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--warning">
                <IconFileAlert :size="14" :stroke-width="1.7" class="mr-1" />
                Penawaran Belum SO
                <span class="panel-header-sub ml-1">(1 tahun terakhir)</span>
                <span v-if="penSummary.BelumSpk" class="badge-count ml-auto">
                  {{ penSummary.BelumSpk }}
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-primary">{{
                        penSummary.TotalPenawaran
                      }}</span>
                      <span class="pen-stat-lbl">Total</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-success">{{
                        penSummary.SudahSpk
                      }}</span>
                      <span class="pen-stat-lbl">Ada SPK/SO</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-error">{{
                        penSummary.BelumSpk
                      }}</span>
                      <span class="pen-stat-lbl">Belum</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val"
                        :class="
                          konversiRate >= 80
                            ? 'text-success'
                            : konversiRate >= 50
                              ? 'text-warning'
                              : 'text-error'
                        "
                      >
                        {{ konversiRate }}%
                      </span>
                      <span class="pen-stat-lbl">Konversi</span>
                    </div>
                  </div>
                  <div
                    v-if="penawaranBelumSpk.length || isLoadingMorePen"
                    class="pen-list"
                  >
                    <div
                      v-for="p in penawaranBelumSpk"
                      :key="p.Nomor"
                      class="pen-item"
                      :class="umurClass(p.UmurHari)"
                      style="cursor: pointer"
                      @click="
                        router.push(
                          `/penjualan/penawaran/edit/${encodeURIComponent(p.Nomor)}`,
                        )
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ p.Nomor }}</span>
                        <div class="d-flex align-center" style="gap: 6px">
                          <span class="pen-divisi">{{ p.Divisi || "" }}</span>
                          <span class="pen-age" :class="umurClass(p.UmurHari)"
                            >{{ p.UmurHari }}h</span
                          >
                        </div>
                      </div>
                      <div class="pen-cus">{{ p.NamaCustomer }}</div>
                      <div v-if="p.Keterangan" class="pen-ket">
                        {{ p.Keterangan }}
                      </div>
                    </div>
                    <div ref="penSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMorePen" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!penHasMore && penawaranBelumSpk.length"
                        class="pen-end"
                      >
                        {{ penawaranBelumSpk.length }} penawaran
                      </span>
                    </div>
                  </div>
                  <DashState
                    v-else
                    kind="empty"
                    message="Semua penawaran sudah ada SPK-nya"
                  />
                </template>
              </div>
            </div>
          </v-col>

          <!-- ── Row baru: Realisasi Penawaran — histori bulanan per divisi ── -->
          <v-row dense class="mb-2">
            <v-col
              v-for="grp in realisasiBulananData"
              :key="grp.divisi"
              cols="12"
              md="6"
              lg="4"
            >
              <div
                class="manksi-panel content-panel fill-height"
                :class="{
                  'rp-total-card': grp.divisi === 'TOTAL SEMUA DIVISI',
                }"
              >
                <div
                  class="panel-header"
                  :class="
                    grp.divisi === 'TOTAL SEMUA DIVISI'
                      ? 'panel-header--green'
                      : 'panel-header--blue'
                  "
                >
                  <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                  Realisasi Penawaran — {{ grp.divisi }}
                  <span class="panel-header-sub ml-1">(12 bulan)</span>
                </div>
                <div class="panel-body">
                  <DashState v-if="isLoadingDashboard" kind="loading" />
                  <template v-else>
                    <div class="rp-bulanan-list">
                      <div
                        v-for="(m, idx) in grp.bulanan"
                        :key="m.Bulan"
                        class="rp-bulanan-row"
                      >
                        <div class="rp-bulanan-bulan">
                          {{ formatBulanLabel(m.Bulan) }}
                        </div>
                        <div class="rp-bulanan-bar-wrap">
                          <div class="rp-bulanan-bar">
                            <div
                              v-for="st in ['OPEN', 'CLOSE', 'BATAL']"
                              :key="st"
                              v-show="rpSegPct(m, st) > 0"
                              class="rp-bulanan-seg"
                              :class="'rp-seg--' + st.toLowerCase()"
                              :style="{ width: rpSegPct(m, st) + '%' }"
                            >
                              <div
                                class="rp-tooltip"
                                :class="{ 'rp-tooltip--below': idx < 2 }"
                              >
                                <div class="rp-tooltip-title">{{ st }}</div>
                                <div>
                                  {{ m.statuses[st]?.JmlItem || 0 }} item
                                </div>
                                <div>
                                  {{ shortNum(m.statuses[st]?.Nilai || 0) }}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div class="rp-bulanan-total">
                          {{ shortNum(m.totalNilai) }}
                        </div>
                      </div>
                    </div>
                    <div class="real-legend">
                      <span
                        class="leg-dot"
                        style="background: var(--dsh-good)"
                      />Close
                      <span
                        class="leg-dot ml-2"
                        style="background: var(--dsh-bad)"
                      />Batal
                      <span
                        class="leg-dot ml-2"
                        style="background: var(--dsh-accent-mid)"
                      />Open
                    </div>
                  </template>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-row>

        <!-- ── Row: Widget A & B — Kecepatan Konversi ── -->
        <v-row dense class="mb-2">
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--blue">
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Penawaran → MAP
                <span class="panel-header-sub ml-1">(90 hari terakhir)</span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else-if="realisasiPenToMap.totalItem">
                  <div class="kk-stack">
                    <div
                      v-for="k in realisasiPenToMap.kategori"
                      :key="k.kode"
                      v-show="k.Pct > 0"
                      class="kk-seg"
                      :style="{
                        width: k.Pct + '%',
                        background: KATEGORI_COLOR[k.kode],
                      }"
                    >
                      <span v-if="k.Pct >= 8">{{ k.Pct }}%</span>
                    </div>
                  </div>
                  <div class="kk-list">
                    <div
                      v-for="k in realisasiPenToMap.kategori"
                      :key="k.kode"
                      class="kk-row"
                    >
                      <span
                        class="kk-dot"
                        :style="{ background: KATEGORI_COLOR[k.kode] }"
                      />
                      <span class="kk-label">{{ KATEGORI_LABEL[k.kode] }}</span>
                      <span class="kk-item"
                        >{{ k.JmlItem }} item ({{ k.Pct }}%)</span
                      >
                      <span class="kk-nilai">{{ shortNum(k.Nilai) }}</span>
                    </div>
                  </div>
                  <div
                    style="
                      overflow-x: auto;
                      max-height: 320px;
                      overflow-y: auto;
                      border-top: 1px solid var(--dsh-fill);
                    "
                  >
                    <table class="rp-tbl">
                      <thead>
                        <tr>
                          <th style="width: 140px">No. Penawaran</th>
                          <th style="width: 90px; text-align: center">
                            Tanggal
                          </th>
                          <th style="min-width: 140px">Customer</th>
                          <th style="width: 110px">Divisi</th>
                          <th style="width: 90px; text-align: right">Nilai</th>
                          <th style="width: 60px; text-align: right">Item</th>
                          <th style="width: 90px; text-align: center">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, idx) in ptmDetailList" :key="idx">
                          <td
                            style="
                              font-family: monospace;
                              color: var(--dsh-accent);
                              font-weight: 600;
                            "
                          >
                            {{ row.Nomor }}
                          </td>
                          <td style="text-align: center">{{ row.Tanggal }}</td>
                          <td
                            style="
                              overflow: hidden;
                              text-overflow: ellipsis;
                              white-space: nowrap;
                              max-width: 140px;
                            "
                            :title="row.Customer"
                          >
                            {{ row.Customer }}
                          </td>
                          <td>{{ row.Divisi }}</td>
                          <td style="text-align: right">
                            {{ shortNum(row.Nilai) }}
                          </td>
                          <td style="text-align: right">{{ row.JmlItem }}</td>
                          <td style="text-align: center">
                            <span
                              class="rp-badge"
                              :style="{
                                background: KATEGORI_COLOR[row.Status] + '22',
                                color: KATEGORI_COLOR[row.Status],
                              }"
                            >
                              {{ KATEGORI_LABEL[row.Status] }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="rp-total-row">
                          <td
                            colspan="4"
                            style="font-weight: 700; text-align: right"
                          >
                            TOTAL:
                          </td>
                          <td style="text-align: right; font-weight: 700">
                            {{ shortNum(realisasiPenToMap.totalNilai) }}
                          </td>
                          <td style="text-align: right; font-weight: 700">
                            {{ fmtNum(realisasiPenToMap.totalQty) }}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                    <div
                      ref="ptmDetailSentinelEl"
                      style="padding: 6px; text-align: center"
                    >
                      <span v-if="isLoadingMorePtmDetail" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!ptmDetailHasMore && ptmDetailList.length"
                        class="pen-end"
                      >
                        {{ ptmDetailList.length }} penawaran ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data penawaran 90 hari terakhir."
                />
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--teal">
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                MAP → SO
                <span class="panel-header-sub ml-1">(90 hari terakhir)</span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else-if="realisasiMapToSo.totalItem">
                  <div class="kk-stack">
                    <div
                      v-for="k in realisasiMapToSo.kategori"
                      :key="k.kode"
                      v-show="k.Pct > 0"
                      class="kk-seg"
                      :style="{
                        width: k.Pct + '%',
                        background: KATEGORI_COLOR[k.kode],
                      }"
                    >
                      <span v-if="k.Pct >= 8">{{ k.Pct }}%</span>
                    </div>
                  </div>
                  <div class="kk-list">
                    <div
                      v-for="k in realisasiMapToSo.kategori"
                      :key="k.kode"
                      class="kk-row"
                    >
                      <span
                        class="kk-dot"
                        :style="{ background: KATEGORI_COLOR[k.kode] }"
                      />
                      <span class="kk-label">{{ KATEGORI_LABEL[k.kode] }}</span>
                      <span class="kk-item"
                        >{{ k.JmlItem }} item ({{ k.Pct }}%)</span
                      >
                      <span class="kk-nilai">{{ shortNum(k.Nilai) }}</span>
                    </div>
                  </div>
                  <div
                    style="
                      overflow-x: auto;
                      max-height: 320px;
                      overflow-y: auto;
                      border-top: 1px solid var(--dsh-fill);
                    "
                  >
                    <table class="rp-tbl">
                      <thead>
                        <tr>
                          <th style="width: 140px">No. MAP</th>
                          <th style="width: 90px; text-align: center">
                            Tanggal
                          </th>
                          <th style="min-width: 140px">Customer</th>
                          <th style="width: 110px">Divisi</th>
                          <th style="width: 90px; text-align: right">Nilai</th>
                          <th style="width: 70px; text-align: right">Qty</th>
                          <th style="width: 90px; text-align: center">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, idx) in mtsDetailList" :key="idx">
                          <td
                            style="
                              font-family: monospace;
                              color: var(--dsh-accent);
                              font-weight: 600;
                            "
                          >
                            {{ row.Nomor }}
                          </td>
                          <td style="text-align: center">{{ row.Tanggal }}</td>
                          <td
                            style="
                              overflow: hidden;
                              text-overflow: ellipsis;
                              white-space: nowrap;
                              max-width: 140px;
                            "
                            :title="row.Customer"
                          >
                            {{ row.Customer }}
                          </td>
                          <td>{{ row.Divisi }}</td>
                          <td style="text-align: right">
                            {{ shortNum(row.Nilai) }}
                          </td>
                          <td style="text-align: right">
                            {{ fmtNum(row.Qty || 0) }}
                          </td>
                          <td style="text-align: center">
                            <span
                              class="rp-badge"
                              :style="{
                                background: KATEGORI_COLOR[row.Status] + '22',
                                color: KATEGORI_COLOR[row.Status],
                              }"
                            >
                              {{ KATEGORI_LABEL[row.Status] }}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="rp-total-row">
                          <td
                            colspan="4"
                            style="font-weight: 700; text-align: right"
                          >
                            TOTAL:
                          </td>
                          <td style="text-align: right; font-weight: 700">
                            {{ shortNum(realisasiMapToSo.totalNilai) }}
                          </td>
                          <td style="text-align: right; font-weight: 700">
                            {{ fmtNum(realisasiMapToSo.totalQty) }}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                    <div
                      ref="mtsDetailSentinelEl"
                      style="padding: 6px; text-align: center"
                    >
                      <span v-if="isLoadingMoreMtsDetail" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!mtsDetailHasMore && mtsDetailList.length"
                        class="pen-end"
                      >
                        {{ mtsDetailList.length }} MAP ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data MAP 90 hari terakhir."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row 3: Kunjungan Sales ── -->
        <v-row dense>
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--green">
                <IconWalk :size="14" :stroke-width="1.7" class="mr-1" />
                Kunjungan Sales
                <span class="panel-header-sub ml-1">(90 hari terakhir)</span>
                <button
                  class="po-bpb-link ml-auto"
                  @click="goToKunjunganDetail()"
                >
                  Lihat Semua →
                </button>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else-if="kunjunganRows.length">
                  <div class="knj-wrap">
                    <div
                      v-for="row in kunjunganRows"
                      :key="row.Nama_Sales"
                      class="knj-row"
                    >
                      <div class="knj-meta">
                        <span
                          class="knj-sales"
                          style="
                            cursor: pointer;
                            text-decoration: underline dotted;
                          "
                          title="Lihat Effective Calling"
                          @click="openEffectiveCalling(row.Nama_Sales)"
                          >{{ row.Nama_Sales }}</span
                        >
                        <div class="knj-stats">
                          <span class="knj-badge done">✓ {{ row.Done }}</span>
                          <span class="knj-badge failed"
                            >✕ {{ row.Failed }}</span
                          >
                          <span class="knj-badge unplan"
                            >+ {{ row.Unplan }}</span
                          >
                          <span class="knj-total">{{ row.Total }} total</span>
                          <span
                            v-if="row.NominalPenawaran"
                            class="knj-nominal-badge"
                            title="Total nominal penawaran bulan ini"
                          >
                            P: {{ shortNum(row.NominalPenawaran) }}
                          </span>
                          <span
                            v-if="row.NominalMintaHarga"
                            class="knj-nominal-badge knj-nominal-badge--mh"
                            title="Total nominal minta harga bulan ini"
                          >
                            MH: {{ shortNum(row.NominalMintaHarga) }}
                          </span>
                          <button
                            class="knj-detail-btn"
                            @click="goToKunjunganDetail(row.Nama_Sales)"
                          >
                            Detail →
                          </button>
                        </div>
                      </div>
                      <div class="knj-bar-wrap">
                        <div class="knj-bar">
                          <div
                            class="knj-seg knj-done"
                            :style="{
                              width: row.Total
                                ? (row.Done / row.Total) * 100 + '%'
                                : '0%',
                            }"
                          />
                          <div
                            class="knj-seg knj-unplan"
                            :style="{
                              width: row.Total
                                ? (row.Unplan / row.Total) * 100 + '%'
                                : '0%',
                            }"
                          />
                          <div
                            class="knj-seg knj-failed"
                            :style="{
                              width: row.Total
                                ? (row.Failed / row.Total) * 100 + '%'
                                : '0%',
                            }"
                          />
                        </div>
                        <span class="knj-pct">
                          {{
                            row.Total
                              ? Math.round((row.Done / row.Total) * 100)
                              : 0
                          }}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="real-legend">
                    <span
                      class="leg-dot"
                      style="background: var(--dsh-good)"
                    />Done
                    <span
                      class="leg-dot ml-2"
                      style="background: var(--dsh-accent-mid)"
                    />Unplan
                    <span
                      class="leg-dot ml-2"
                      style="background: var(--dsh-bad)"
                    />Failed
                    <span class="ml-2" style="font-size: 10px"
                      >P = Penawaran · MH = Minta Harga</span
                    >
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data kunjungan bulan ini."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mb-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-fill);
                  color: var(--dsh-ink);
                  border-bottom: 1px solid var(--dsh-line);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Stok Slow Moving & Dead Stock serta Konversi per kg Kain
                <span class="panel-header-sub ml-1">(per jenis bahan)</span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else-if="slowDeadStockData.length">
                  <div
                    v-if="konversiBabaranData.length"
                    class="d-flex flex-wrap"
                    style="
                      gap: 0;
                      border-bottom: 1px solid var(--dsh-fill);
                      background: var(--dsh-fill);
                    "
                  >
                    <div
                      v-for="k in konversiBabaranData"
                      :key="k.kategori"
                      class="pen-stat"
                      style="padding: 8px 4px"
                    >
                      <span
                        class="pen-stat-val text-primary"
                        style="font-size: 15px"
                      >
                        {{ fmtDec(k.pcsPerKg, 1) }} pcs/kg
                      </span>
                      <span class="pen-stat-lbl">{{ k.label }}</span>
                    </div>
                  </div>
                  <v-expansion-panels variant="accordion" multiple>
                    <v-expansion-panel
                      v-for="grp in slowDeadStockPaged"
                      :key="grp.jenisNama"
                    >
                      <v-expansion-panel-title
                        style="min-height: 40px; padding: 8px 12px"
                      >
                        <div
                          style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            font-size: 11px;
                            flex-wrap: wrap;
                          "
                        >
                          <span
                            style="font-weight: 700; color: var(--dsh-ink)"
                            >{{ grp.jenisNama }}</span
                          >
                          <span
                            v-if="grp.jmlSlowmoving"
                            class="badge-count"
                            style="background: var(--dsh-warn)"
                          >
                            Slowmoving {{ grp.jmlSlowmoving }}
                          </span>
                          <span
                            v-if="grp.jmlDeadStock"
                            class="badge-count"
                            style="background: var(--dsh-bad)"
                          >
                            Dead Stock {{ grp.jmlDeadStock }}
                          </span>
                          <span style="color: var(--dsh-ink-3)">
                            Total stok:
                            <template
                              v-for="(t, i) in grp.totalStokList"
                              :key="t.satuan"
                            >
                              {{ i > 0 ? ", " : "" }}{{ fmtNum(t.stok) }}
                              {{ t.satuan }}
                            </template>
                          </span>
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text style="padding: 0">
                        <div style="overflow-x: auto">
                          <table class="gb-tbl">
                            <thead>
                              <tr>
                                <th>Nama Bahan</th>
                                <th class="tr">Stok</th>
                                <th class="tr">Umur (hr)</th>
                                <th class="tc">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="item in grp.items" :key="item.Kode">
                                <td>{{ item.Nama || item.Kode }}</td>
                                <td class="tr">
                                  {{ fmtNum(item.Stok) }} {{ item.Satuan }}
                                </td>
                                <td class="tr">{{ item.UmurHari }}</td>
                                <td class="tc">
                                  <span
                                    class="gb-badge"
                                    :class="
                                      item.Status === 'Dead Stock'
                                        ? 'gb-badge--danger'
                                        : 'gb-badge--warn'
                                    "
                                  >
                                    {{ item.Status }}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                    <div
                      v-if="slowDeadStockTotalPages > 1"
                      class="d-flex align-center justify-center"
                      style="
                        gap: 10px;
                        padding: 8px 12px;
                        border-top: 1px solid var(--dsh-fill);
                      "
                    >
                      <button
                        class="knj-detail-btn"
                        :disabled="slowDeadStockPage === 1"
                        :style="{ opacity: slowDeadStockPage === 1 ? 0.4 : 1 }"
                        @click="slowDeadStockPage--"
                      >
                        ← Sebelumnya
                      </button>
                      <span style="font-size: 11px; color: var(--dsh-ink-2)">
                        Halaman {{ slowDeadStockPage }} dari
                        {{ slowDeadStockTotalPages }} ({{
                          slowDeadStockData.length
                        }}
                        jenis bahan)
                      </span>
                      <button
                        class="knj-detail-btn"
                        :disabled="
                          slowDeadStockPage === slowDeadStockTotalPages
                        "
                        :style="{
                          opacity:
                            slowDeadStockPage === slowDeadStockTotalPages
                              ? 0.4
                              : 1,
                        }"
                        @click="slowDeadStockPage++"
                      >
                        Berikutnya →
                      </button>
                    </div>
                  </v-expansion-panels>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Tidak ada bahan slow moving atau dead stock"
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row 7: Proyeksi Potensial ── -->
        <v-row dense class="mt-2">
          <v-col cols="12" md="8">
            <div class="manksi-panel content-panel">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-warn-soft);
                  color: var(--dsh-warn);
                  border-bottom: 1px solid var(--dsh-warn-soft);
                "
              >
                <IconCoin :size="14" :stroke-width="1.7" class="mr-1" />
                Proyeksi Potensial
                <span class="panel-header-sub ml-1"
                  >(ditandai manual Sales/MO)</span
                >
                <button
                  class="knj-detail-btn ml-auto"
                  style="
                    border-color: var(--dsh-warn-soft);
                    color: var(--dsh-warn);
                  "
                  :disabled="isExportingPotensi"
                  @click="exportPotensiExcel"
                >
                  <IconFileSpreadsheet
                    :size="12"
                    style="vertical-align: middle; margin-right: 2px"
                  />
                  {{ isExportingPotensi ? "Mengexport..." : "Export" }}
                </button>
                <button
                  class="knj-detail-btn"
                  style="
                    border-color: var(--dsh-warn-soft);
                    color: var(--dsh-warn);
                  "
                  @click="openSetPotensiDialog"
                >
                  + Set Potensial
                </button>
              </div>
              <div class="panel-body">
                <div class="pen-summary-bar">
                  <div class="pen-stat">
                    <span class="pen-stat-val text-primary">{{
                      potensiSummary.jmlItem
                    }}</span>
                    <span class="pen-stat-lbl">Jml Item</span>
                  </div>
                  <div class="pen-stat">
                    <span
                      class="pen-stat-val"
                      style="color: var(--dsh-accent)"
                      >{{ shortNum(potensiSummary.totalPotensi) }}</span
                    >
                    <span class="pen-stat-lbl">Total Potensi</span>
                  </div>
                  <div class="pen-stat">
                    <span class="pen-stat-val text-success">{{
                      shortNum(potensiSummary.totalRealisasi)
                    }}</span>
                    <span class="pen-stat-lbl">Realisasi</span>
                  </div>
                </div>

                <div
                  v-if="potensiList.length || isLoadingMorePotensi"
                  class="gb-list"
                  style="max-height: 340px"
                >
                  <div
                    v-for="item in potensiList"
                    :key="item.pot_nomor"
                    class="gb-row"
                    :class="item.pot_status === 'BATAL' ? 'row-minus' : ''"
                    style="align-items: flex-start"
                  >
                    <div class="gb-nama" style="width: 190px">
                      <span class="pen-nomor" style="font-size: 10px">{{
                        item.pot_nomor
                      }}</span>
                      <div
                        style="
                          font-size: 10px;
                          color: var(--dsh-ink-3);
                          cursor: pointer;
                          text-decoration: underline dotted;
                        "
                        title="Buka untuk edit"
                        @click="goToPotensiSource(item)"
                      >
                        {{ item.Sumber }} {{ item.NomorSumber }}
                      </div>
                    </div>
                    <div
                      class="gb-bar-wrap"
                      style="flex-direction: column; align-items: stretch"
                    >
                      <div class="d-flex justify-space-between">
                        <span class="pen-cus">{{ item.pot_nama_item }}</span>
                        <span
                          style="
                            font-size: 11px;
                            font-weight: 700;
                            color: var(--dsh-accent);
                          "
                        >
                          {{ shortNum(item.pot_harga) }}
                        </span>
                      </div>
                      <div
                        class="d-flex justify-space-between align-center mt-1"
                      >
                        <span style="font-size: 10px; color: var(--dsh-ink-2)">
                          {{ item.cus_nama || "-" }} ·
                          {{ item.sal_nama || "-" }} · oleh
                          {{ item.user_create }}
                        </span>
                        <span
                          v-if="item.pot_status === 'BATAL'"
                          class="rp-badge"
                          style="
                            background: var(--dsh-fill);
                            color: var(--dsh-ink-3);
                          "
                        >
                          Batal
                        </span>
                        <span
                          v-else-if="item.IsRealisasi"
                          class="rp-badge"
                          style="
                            background: var(--dsh-good-soft);
                            color: var(--dsh-good);
                          "
                        >
                          Realisasi
                        </span>
                        <button
                          v-else
                          class="knj-detail-btn"
                          style="
                            border-color: var(--dsh-bad-soft);
                            color: var(--dsh-bad);
                          "
                          @click="openBatalPotensiDialog(item)"
                        >
                          Batal
                        </button>
                      </div>
                      <div
                        v-if="item.pot_alasan_batal"
                        style="
                          font-size: 10px;
                          font-style: italic;
                          color: var(--dsh-bad);
                        "
                      >
                        {{ item.pot_alasan_batal }}
                      </div>
                    </div>
                  </div>
                  <div ref="potensiSentinelEl" class="pen-sentinel">
                    <span v-if="isLoadingMorePotensi" class="pen-loading"
                      >Memuat...</span
                    >
                    <span
                      v-else-if="!potensiHasMore && potensiList.length"
                      class="pen-end"
                    >
                      {{ potensiList.length }} potensi ditampilkan
                    </span>
                  </div>
                </div>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada penawaran/MAP yang ditandai potensial."
                />
              </div>
            </div>
          </v-col>

          <!-- Card baru: Proyeksi Potensial - Batal -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-fill);
                  color: var(--dsh-ink);
                  border-bottom: 1px solid var(--dsh-line);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Proyeksi Potensial — Batal
                <span
                  v-if="potensiSummary.totalBatal"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-ink-2)"
                >
                  {{ shortNum(potensiSummary.totalBatal) }}
                </span>
              </div>
              <div class="panel-body">
                <div
                  v-if="potensiBatalList.length || isLoadingMorePotensiBatal"
                  class="gb-list"
                  style="max-height: 340px"
                >
                  <div
                    v-for="item in potensiBatalList"
                    :key="item.pot_nomor"
                    class="gb-row row-minus"
                    style="align-items: flex-start"
                  >
                    <div class="gb-nama" style="width: 150px">
                      <span class="pen-nomor" style="font-size: 10px">{{
                        item.pot_nomor
                      }}</span>
                      <div style="font-size: 10px; color: var(--dsh-ink-3)">
                        {{ item.Sumber }} {{ item.NomorSumber }}
                      </div>
                    </div>
                    <div
                      class="gb-bar-wrap"
                      style="flex-direction: column; align-items: stretch"
                    >
                      <div class="d-flex justify-space-between">
                        <span class="pen-cus">{{ item.pot_nama_item }}</span>
                        <span
                          style="
                            font-size: 11px;
                            font-weight: 700;
                            color: var(--dsh-ink-2);
                          "
                        >
                          {{ shortNum(item.pot_harga) }}
                        </span>
                      </div>
                      <div style="font-size: 10px; color: var(--dsh-ink-3)">
                        {{ item.cus_nama || "-" }} ·
                        {{ item.sal_nama || "-" }} · dibatalkan
                        {{ formatTanggalJam(item.TanggalBatal) }}
                      </div>
                      <div
                        v-if="item.pot_alasan_batal"
                        style="
                          font-size: 10px;
                          font-style: italic;
                          color: var(--dsh-bad);
                          margin-top: 2px;
                        "
                      >
                        Alasan: {{ item.pot_alasan_batal }}
                      </div>
                    </div>
                  </div>
                  <div ref="potensiBatalSentinelEl" class="pen-sentinel">
                    <span v-if="isLoadingMorePotensiBatal" class="pen-loading"
                      >Memuat...</span
                    >
                    <span
                      v-else-if="
                        !potensiBatalHasMore && potensiBatalList.length
                      "
                      class="pen-end"
                    >
                      {{ potensiBatalList.length }} potensi batal ditampilkan
                    </span>
                  </div>
                </div>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada potensi yang dibatalkan."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Proyeksi Inkaso ── -->
        <v-row dense class="mt-2">
          <v-col cols="12" md="8">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--teal">
                <IconCoin :size="14" :stroke-width="1.7" class="mr-1" />
                Proyeksi Inkaso
                <span class="panel-header-sub ml-1"
                  >(invoice jatuh tempo yang ditagih, per sales)</span
                >
                <button
                  class="knj-detail-btn ml-auto"
                  style="
                    border-color: var(--dsh-accent-mid);
                    color: var(--dsh-accent);
                  "
                  @click="openSetInkasoDialog"
                >
                  + Set Inkaso
                </button>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingInkaso" kind="loading" />
                <template v-else>
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-primary">{{
                        inkasoSummary.jmlItem
                      }}</span>
                      <span class="pen-stat-lbl">Invoice Aktif</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val"
                        style="color: var(--dsh-bad)"
                        >{{ shortNum(inkasoSummary.totalProyeksi) }}</span
                      >
                      <span class="pen-stat-lbl">Sisa Ditagih</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-success">{{
                        shortNum(inkasoSummary.totalRealisasi)
                      }}</span>
                      <span class="pen-stat-lbl">Terealisasi</span>
                    </div>
                  </div>

                  <v-expansion-panels
                    v-if="inkasoBySales.length"
                    variant="accordion"
                    multiple
                  >
                    <v-expansion-panel
                      v-for="grp in inkasoBySales"
                      :key="grp.salKode || 'none'"
                    >
                      <v-expansion-panel-title
                        style="min-height: 40px; padding: 8px 12px"
                      >
                        <div
                          style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            font-size: 11px;
                            flex-wrap: wrap;
                            width: 100%;
                          "
                        >
                          <span
                            style="
                              font-weight: 700;
                              color: var(--dsh-accent);
                              text-transform: uppercase;
                            "
                            >{{ grp.salNama }}</span
                          >
                          <span
                            class="badge-count"
                            style="background: var(--dsh-accent)"
                            >{{ grp.jmlItem }} invoice</span
                          >
                          <span style="color: var(--dsh-bad); font-weight: 700"
                            >Sisa {{ shortNum(grp.totalSisa) }}</span
                          >
                          <span
                            v-if="grp.totalTerealisasi"
                            style="color: var(--dsh-good)"
                            >Terealisasi
                            {{ shortNum(grp.totalTerealisasi) }}</span
                          >
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text style="padding: 0">
                        <div style="overflow-x: auto">
                          <table class="gb-tbl" style="min-width: 820px">
                            <thead>
                              <tr>
                                <th>Invoice</th>
                                <th>Customer</th>
                                <th class="tc">Jatuh Tempo</th>
                                <th class="tr">Nominal Awal</th>
                                <th class="tr">Sisa</th>
                                <th class="tc">Target Bayar</th>
                                <th>Catatan</th>
                                <th class="tc"></th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="it in grp.items" :key="it.nomor">
                                <td
                                  style="
                                    font-family: monospace;
                                    font-weight: 600;
                                    color: var(--dsh-accent);
                                  "
                                >
                                  {{ it.nota }}
                                </td>
                                <td
                                  :title="it.cusNama"
                                  style="
                                    max-width: 200px;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                  "
                                >
                                  {{ it.cusNama || it.cusKode }}
                                </td>
                                <td class="tc">
                                  {{ it.tempo }}
                                  <span
                                    class="pen-age"
                                    :style="{
                                      color: telatColor(it.terlambatHari),
                                      fontWeight: 700,
                                    }"
                                    >· {{ it.terlambatHari }}h</span
                                  >
                                </td>
                                <td class="tr">{{ fmtNum(it.nominalAwal) }}</td>
                                <td
                                  class="tr"
                                  style="
                                    font-weight: 700;
                                    color: var(--dsh-bad);
                                  "
                                >
                                  {{ fmtNum(it.sisa) }}
                                </td>
                                <td class="tc">
                                  <span
                                    :style="{
                                      color: lewatTarget(it)
                                        ? 'var(--dsh-bad)'
                                        : 'var(--dsh-ink)',
                                      fontWeight: lewatTarget(it) ? 700 : 400,
                                    }"
                                  >
                                    {{ fmtTglIso(it.tglTarget) }}
                                    <span v-if="lewatTarget(it)">(lewat)</span>
                                  </span>
                                </td>
                                <td
                                  :title="it.catatan"
                                  style="
                                    max-width: 180px;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                    white-space: nowrap;
                                    color: var(--dsh-ink-2);
                                  "
                                >
                                  {{ it.catatan || "-" }}
                                  <span
                                    style="
                                      font-size: 9px;
                                      color: var(--dsh-ink-3);
                                    "
                                    :title="'Ditandai oleh ' + it.userCreate"
                                    >· {{ it.userCreate }}</span
                                  >
                                </td>
                                <td class="tc">
                                  <button
                                    class="knj-detail-btn"
                                    style="
                                      border-color: var(--dsh-bad-soft);
                                      color: var(--dsh-bad);
                                    "
                                    @click="openBatalInkasoDialog(it)"
                                  >
                                    Batal
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                  <DashState
                    v-else
                    kind="empty"
                    message="Belum ada invoice yang ditandai proyeksi inkaso."
                  />
                </template>
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-fill);
                  color: var(--dsh-ink);
                  border-bottom: 1px solid var(--dsh-line);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Proyeksi Inkaso — Batal
                <span
                  v-if="inkasoSummary.totalBatal"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-ink-2)"
                >
                  {{ shortNum(inkasoSummary.totalBatal) }}
                </span>
              </div>
              <div class="panel-body">
                <div
                  v-if="inkasoBatalList.length || isLoadingMoreInkasoBatal"
                  class="gb-list"
                  style="max-height: 340px"
                >
                  <div
                    v-for="item in inkasoBatalList"
                    :key="item.Nomor"
                    class="gb-row row-minus"
                    style="align-items: flex-start"
                  >
                    <div class="gb-nama" style="width: 130px">
                      <span class="pen-nomor" style="font-size: 10px">{{
                        item.Nomor
                      }}</span>
                      <div style="font-size: 10px; color: var(--dsh-ink-3)">
                        {{ item.Nota }}
                      </div>
                    </div>
                    <div
                      class="gb-bar-wrap"
                      style="flex-direction: column; align-items: stretch"
                    >
                      <div class="d-flex justify-space-between">
                        <span class="pen-cus">{{ item.CusNama || "-" }}</span>
                        <span
                          style="
                            font-size: 11px;
                            font-weight: 700;
                            color: var(--dsh-ink-2);
                          "
                        >
                          {{ shortNum(item.Nominal) }}
                        </span>
                      </div>
                      <div style="font-size: 10px; color: var(--dsh-ink-3)">
                        {{ item.SalNama || "-" }} · dibatalkan oleh
                        {{ item.UserModified }} ·
                        {{ formatTanggalJam(item.TanggalBatal) }}
                      </div>
                      <div
                        v-if="item.AlasanBatal"
                        style="
                          font-size: 10px;
                          font-style: italic;
                          color: var(--dsh-bad);
                          margin-top: 2px;
                        "
                      >
                        Alasan: {{ item.AlasanBatal }}
                      </div>
                    </div>
                  </div>
                  <div ref="inkasoBatalSentinelEl" class="pen-sentinel">
                    <span v-if="isLoadingMoreInkasoBatal" class="pen-loading"
                      >Memuat...</span
                    >
                    <span
                      v-else-if="!inkasoBatalHasMore && inkasoBatalList.length"
                      class="pen-end"
                    >
                      {{ inkasoBatalList.length }} proyeksi batal ditampilkan
                    </span>
                  </div>
                </div>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada proyeksi inkaso yang dibatalkan."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense>
          <!-- Panel 1: Konversi MAP → SPK -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--blue">
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Konversi MAP → SO
                <span
                  class="ml-auto pct-badge"
                  :class="
                    mapSpkRate >= 80
                      ? 'pct-good'
                      : mapSpkRate >= 50
                        ? 'pct-mid'
                        : 'pct-low'
                  "
                >
                  {{ mapSpkRate }}% konversi
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <!-- Metric mini -->
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-primary">{{
                        mapSpkMetric.TotalMAP
                      }}</span>
                      <span class="pen-stat-lbl">Total MAP</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-success">{{
                        mapSpkMetric.SudahSO
                      }}</span>
                      <span class="pen-stat-lbl">Sudah SO</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-error">{{
                        mapSpkMetric.BelumSO
                      }}</span>
                      <span class="pen-stat-lbl">Belum SO</span>
                    </div>
                  </div>

                  <!-- Nilai per divisi -->
                  <div class="real-list" style="max-height: 160px">
                    <div
                      v-for="row in mapDivisi"
                      :key="row.Divisi"
                      class="real-row"
                    >
                      <div class="real-meta">
                        <span class="real-divisi">{{ row.Divisi }}</span>
                        <span class="real-nominal">
                          SO {{ shortNum(row.NilaiSO) }} | Pot
                          {{ shortNum(row.NilaiPotensi) }}
                        </span>
                      </div>
                      <div class="real-bar-wrap">
                        <div class="real-bar">
                          <div
                            class="real-seg real-seg--close"
                            :style="{
                              width:
                                row.NilaiSO + row.NilaiPotensi
                                  ? (row.NilaiSO /
                                      (row.NilaiSO + row.NilaiPotensi)) *
                                      100 +
                                    '%'
                                  : '0%',
                            }"
                          />
                          <div
                            class="real-seg real-seg--open"
                            :style="{
                              width:
                                row.NilaiSO + row.NilaiPotensi
                                  ? (row.NilaiPotensi /
                                      (row.NilaiSO + row.NilaiPotensi)) *
                                      100 +
                                    '%'
                                  : '0%',
                            }"
                          />
                        </div>
                        <span class="real-pct">
                          {{
                            row.NilaiSO + row.NilaiPotensi
                              ? Math.round(
                                  (row.NilaiSO /
                                    (row.NilaiSO + row.NilaiPotensi)) *
                                    100,
                                )
                              : 0
                          }}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div class="real-legend">
                    <span class="leg-dot leg-close" />Sudah SPK
                    <span class="leg-dot leg-open" />Potensi
                  </div>

                  <!-- Divider -->
                  <div
                    style="
                      border-top: 1px solid var(--dsh-fill);
                      padding: 5px 12px 0;
                      font-size: 10px;
                      color: var(--dsh-ink-3);
                      font-weight: 600;
                    "
                  >
                    MAP BELUM SO
                  </div>

                  <!-- Infinite scroll list -->
                  <div class="pen-list" style="max-height: 200px">
                    <div
                      v-for="m in mapSpkList"
                      :key="m.Nomor"
                      class="pen-item"
                      :class="
                        m.UmurHari >= 14
                          ? 'umur-danger'
                          : m.UmurHari >= 7
                            ? 'umur-warn'
                            : ''
                      "
                      style="cursor: pointer"
                      @click="
                        router.push(
                          `/penjualan/map/form/${encodeURIComponent(m.Nomor)}`,
                        )
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ m.Nomor }}</span>
                        <div class="d-flex align-center" style="gap: 5px">
                          <span class="pen-divisi">{{ m.Divisi }}</span>
                          <span class="pen-age" :class="umurClass(m.UmurHari)"
                            >{{ m.UmurHari }}h</span
                          >
                        </div>
                      </div>
                      <div class="pen-cus">{{ m.NamaCustomer }}</div>
                      <div class="d-flex justify-space-between mt-1">
                        <span class="pen-ket">{{ m.NamaMAP }}</span>
                        <span
                          style="
                            font-size: 10px;
                            color: var(--dsh-accent);
                            font-weight: 600;
                          "
                        >
                          {{ shortNum(m.NilaiPotensi) }}
                        </span>
                      </div>
                    </div>
                    <div ref="mapSpkSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreMapSpk" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!mapSpkHasMore && mapSpkList.length"
                        class="pen-end"
                      >
                        {{ mapSpkList.length }} MAP belum SPK
                      </span>
                    </div>
                  </div>
                  <div
                    v-if="!mapSpkList.length && !isLoadingMoreMapSpk"
                    class="text-center text-grey py-3 text-caption"
                  >
                    Semua MAP sudah ada SPK-nya
                  </div>
                </template>
              </div>
            </div>
          </v-col>

          <!-- Panel 3: Nilai Pipeline MAP -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-accent-soft);
                  color: var(--dsh-accent);
                  border-bottom: 1px solid var(--dsh-accent-soft);
                "
              >
                <IconCoin :size="14" :stroke-width="1.7" class="mr-1" />
                Nilai Pipeline MAP
                <span class="panel-header-sub ml-1">(90 hari terakhir)</span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <!-- Total nilai -->
                  <div
                    style="
                      padding: 8px 12px;
                      border-bottom: 1px solid var(--dsh-fill);
                      display: flex;
                      gap: 0;
                      background: var(--dsh-fill);
                    "
                  >
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val"
                        style="color: var(--dsh-accent); font-size: 14px"
                      >
                        {{ shortNum(mapSpkMetric.TotalNilai) }}
                      </span>
                      <span class="pen-stat-lbl">Total Nilai</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val text-success"
                        style="font-size: 14px"
                      >
                        {{ shortNum(mapSpkMetric.NilaiSudahSO) }}
                      </span>
                      <span class="pen-stat-lbl">Confirmed (SO)</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val text-warning"
                        style="font-size: 14px"
                      >
                        {{ shortNum(mapSpkMetric.NilaiBelumSO) }}
                      </span>
                      <span class="pen-stat-lbl">Potensi</span>
                    </div>
                  </div>

                  <!-- Bar per divisi -->
                  <div class="knj-wrap" style="max-height: 360px">
                    <div
                      v-for="row in mapDivisi"
                      :key="row.Divisi"
                      class="knj-row"
                    >
                      <div class="knj-meta mb-1">
                        <span
                          class="knj-sales"
                          style="color: var(--dsh-accent)"
                          >{{ row.Divisi }}</span
                        >
                        <span
                          class="knj-pct"
                          style="color: var(--dsh-accent); font-weight: 700"
                        >
                          {{ shortNum(row.NilaiSO + row.NilaiPotensi) }}
                        </span>
                      </div>
                      <div class="knj-bar-wrap">
                        <div
                          class="knj-bar"
                          style="background: var(--dsh-accent-soft)"
                        >
                          <!-- SPK (confirmed) -->
                          <div
                            class="knj-seg"
                            style="background: var(--dsh-accent)"
                            :style="{
                              width:
                                row.NilaiSO + row.NilaiPotensi
                                  ? (row.NilaiSO /
                                      (row.NilaiSO + row.NilaiPotensi)) *
                                      100 +
                                    '%'
                                  : '0%',
                            }"
                          />
                          <!-- Potensi -->
                          <div
                            class="knj-seg"
                            style="background: var(--dsh-accent-mid)"
                            :style="{
                              width:
                                row.NilaiSO + row.NilaiPotensi
                                  ? (row.NilaiPotensi /
                                      (row.NilaiSO + row.NilaiPotensi)) *
                                      100 +
                                    '%'
                                  : '0%',
                            }"
                          />
                        </div>
                      </div>
                      <div class="real-detail mt-1">
                        <span style="color: var(--dsh-accent)"
                          >✓ {{ shortNum(row.NilaiSO) }}</span
                        >
                        <span style="color: var(--dsh-accent)"
                          >○ {{ shortNum(row.NilaiPotensi) }}</span
                        >
                        <span style="color: var(--dsh-ink-3)"
                          >{{ row.SudahSO }}/{{ row.TotalMAP }} MAP</span
                        >
                      </div>
                    </div>
                    <div
                      v-if="!mapDivisi.length"
                      class="text-center text-grey py-3 text-caption"
                    >
                      Belum ada data MAP di periode ini.
                    </div>
                  </div>
                  <div class="real-legend">
                    <span
                      class="leg-dot"
                      style="background: var(--dsh-accent)"
                    />Confirmed (SO)
                    <span
                      class="leg-dot"
                      style="background: var(--dsh-accent-mid)"
                    />Potensi
                  </div>
                </template>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mb-2">
          <v-col
            cols="12"
            md="6"
            v-for="grp in statusKirimMapData.filter(
              (g) => g.divisi !== 'KAOSAN',
            )"
            :key="grp.divisi"
          >
            <div class="manksi-panel content-panel mb-2">
              <div class="panel-header panel-header--teal">
                <IconTruckDelivery
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Status Pengiriman MAP — {{ grp.divisi }}
                <span class="panel-header-sub ml-1">(tahun berjalan)</span>
              </div>
              <div class="panel-body" style="overflow-x: auto">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <table v-else class="gb-tbl" style="min-width: 780px">
                  <thead>
                    <tr>
                      <th rowspan="2" style="vertical-align: middle">Bulan</th>
                      <th
                        rowspan="2"
                        style="vertical-align: middle; text-align: right"
                      >
                        Jumlah MAP
                      </th>
                      <th colspan="4" style="text-align: center">Realisasi</th>
                      <th colspan="4" style="text-align: center">
                        Belum Realisasi
                      </th>
                    </tr>
                    <tr>
                      <th class="tr">0-7 hr</th>
                      <th class="tr">8-14 hr</th>
                      <th class="tr">15-30 hr</th>
                      <th class="tr">&gt;30 hr</th>
                      <th class="tr">0-7 hr</th>
                      <th class="tr">8-14 hr</th>
                      <th class="tr">15-30 hr</th>
                      <th class="tr">&gt;30 hr</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="m in grp.bulanan" :key="m.Bulan">
                      <td>{{ formatBulanLabel(m.Bulan) }}</td>
                      <td class="tr" style="font-weight: 700">
                        {{ m.JumlahMAP }}
                      </td>
                      <td class="tr" style="color: var(--dsh-good)">
                        {{ m.real[0] || "-" }}
                      </td>
                      <td class="tr" style="color: var(--dsh-good)">
                        {{ m.real[1] || "-" }}
                      </td>
                      <td class="tr" style="color: var(--dsh-warn)">
                        {{ m.real[2] || "-" }}
                      </td>
                      <td class="tr" style="color: var(--dsh-bad)">
                        {{ m.real[3] || "-" }}
                      </td>
                      <td class="tr" style="color: var(--dsh-ink-2)">
                        {{ m.belum[0] || "-" }}
                      </td>
                      <td class="tr" style="color: var(--dsh-warn)">
                        {{ m.belum[1] || "-" }}
                      </td>
                      <td class="tr" style="color: var(--dsh-warn)">
                        {{ m.belum[2] || "-" }}
                      </td>
                      <td class="tr" style="color: var(--dsh-bad)">
                        {{ m.belum[3] || "-" }}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div
                  v-if="!grp.bulanan.some((m) => m.JumlahMAP > 0)"
                  class="text-center text-grey py-3 text-caption"
                >
                  Belum ada data MAP tahun ini untuk divisi ini.
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ════════════════════════════════════════
           TAB FINANCE / PIUTANG
      ════════════════════════════════════════ -->
      <v-window-item value="finance">
        <!-- Metric cards piutang -->
        <!-- Metric cards piutang — 5 card dalam 2 baris -->
        <v-row dense class="mb-2">
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Total Outstanding</div>
              <div class="sum-value text-error">
                <span v-if="isLoadingDashboard">—</span>
                <span v-else>{{
                  shortNum(piutangData.summary.TotalOutstanding)
                }}</span>
              </div>
              <div class="sum-sub">sisa belum terbayar</div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Invoice Bulan Ini</div>
              <div class="sum-value text-primary">
                <span v-if="isLoadingDashboard">—</span>
                <span v-else>{{
                  shortNum(piutangData.summary.InvoiceBulanIni)
                }}</span>
              </div>
              <div class="sum-sub">tagihan baru diterbitkan</div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Penerimaan Bulan Ini</div>
              <div class="sum-value text-success">
                <span v-if="isLoadingDashboard">—</span>
                <span v-else>{{
                  shortNum(penerimaanSummary.TotalPenerimaanBulanIni)
                }}</span>
              </div>
              <div class="sum-sub">
                <span v-if="!isLoadingDashboard">
                  {{ penerimaanSummary.JmlTransaksiBulanIni }} transaksi
                </span>
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Collection Rate</div>
              <div v-if="isLoadingDashboard" class="sum-value">—</div>
              <template v-else>
                <div class="sum-value" :style="{ color: collectionRateColor }">
                  {{ collectionRate }}%
                </div>
                <div class="cr-bar-wrap">
                  <div class="cr-bar">
                    <div
                      class="cr-fill"
                      :style="{
                        width: collectionRate + '%',
                        background: collectionRateColor,
                      }"
                    />
                  </div>
                  <span class="cr-sub">kredit / debet historis</span>
                </div>
              </template>
            </div>
          </v-col>
        </v-row>

        <!-- Baris 2: Coverage + Saldo belum aplikasi -->
        <v-row dense class="mb-3">
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Coverage Bulan Ini</div>
              <div v-if="isLoadingDashboard" class="sum-value">—</div>
              <template v-else>
                <div class="sum-value" :style="{ color: coverageRateColor }">
                  {{ coverageRate }}%
                </div>
                <div class="cr-bar-wrap">
                  <div class="cr-bar">
                    <div
                      class="cr-fill"
                      :style="{
                        width: Math.min(100, coverageRate) + '%',
                        background: coverageRateColor,
                      }"
                    />
                  </div>
                  <span class="cr-sub">penerimaan / invoice bln ini</span>
                </div>
              </template>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Belum Diaplikasi</div>
              <div class="sum-value" style="color: var(--dsh-warn)">
                <span v-if="isLoadingDashboard">—</span>
                <span v-else>{{
                  shortNum(penerimaanSummary.SaldoBelumAplikasi)
                }}</span>
              </div>
              <div class="sum-sub">penerimaan belum ke invoice</div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Invoice Overdue</div>
              <div class="sum-value text-error">
                <span v-if="isLoadingDashboard">—</span>
                <span v-else>{{ piutangData.summary.overdueTotal }}</span>
              </div>
              <div class="sum-sub">melewati jatuh tempo</div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Terima Bulan Ini (Kredit)</div>
              <div class="sum-value text-success">
                <span v-if="isLoadingDashboard">—</span>
                <span v-else>{{
                  shortNum(piutangData.summary.TerimaBulanIni)
                }}</span>
              </div>
              <div class="sum-sub">diaplikasikan ke invoice</div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mt-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--green">
                <IconCoin :size="14" :stroke-width="1.7" class="mr-1" />
                Target Collection
                <span v-if="targetCollectionData" class="panel-header-sub ml-1">
                  (target dari omzet
                  {{ targetCollectionData.targetBulanLabel }})
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingTargetCollection" kind="loading" />
                <template v-else-if="targetCollectionData">
                  <div style="overflow-x: auto">
                    <table class="gb-tbl" style="min-width: 1040px">
                      <thead>
                        <tr>
                          <th>Sales</th>
                          <th class="tr">Target Omzet</th>
                          <th
                            class="tr"
                            title="Sisa piutang invoice bulan target saat ini"
                          >
                            Piutang Saat Ini
                          </th>
                          <th
                            class="tr"
                            title="Sisa piutang invoice sebelum bulan target, per akhir bulan lalu"
                          >
                            Target Piutang Lama
                          </th>
                          <th class="tr">Total Target</th>
                          <th class="tr">Collection Bulan Ini</th>
                          <th class="tr">% MTD</th>
                          <th class="tr">% YTD</th>
                          <th
                            class="tr"
                            title="Seluruh sisa piutang all-time per sales, per hari ini"
                          >
                            Piutang Real-Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="row in targetCollectionData.items"
                          :key="row.salKode"
                        >
                          <td>
                            <span
                              class="td-sales-link"
                              @click="openTargetDetail(row)"
                            >
                              {{ row.namaSales }}
                            </span>
                          </td>
                          <td class="tr">{{ fmtNum(row.targetBulanIni) }}</td>
                          <td class="tr">{{ fmtNum(row.piutangSaatIni) }}</td>
                          <td class="tr">
                            {{ fmtNum(row.targetPiutangLama) }}
                          </td>
                          <td class="tr" style="font-weight: 600">
                            {{ fmtNum(row.targetTotal) }}
                          </td>
                          <td
                            class="tr"
                            :style="{
                              color:
                                row.sisaCollectionMtd > 0
                                  ? 'var(--dsh-bad)'
                                  : 'var(--dsh-good)',
                              fontWeight: 600,
                            }"
                          >
                            {{ fmtNum(row.collectionMtd) }}
                          </td>
                          <td class="tr">{{ fmtPct(row.pctCollectionMtd) }}</td>
                          <td class="tr">{{ fmtPct(row.pctCollectionYtd) }}</td>
                          <td
                            class="tr"
                            :style="{
                              color:
                                row.piutangRealtime > 0
                                  ? 'var(--dsh-bad)'
                                  : undefined,
                            }"
                          >
                            {{ fmtNum(row.piutangRealtime) }}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="rp-total-row">
                          <td style="font-weight: 700">GRAND TOTAL</td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.targetBulanIni,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.piutangSaatIni,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal
                                  .targetPiutangLama,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.targetTotal,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.collectionMtd,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtPct(
                                targetCollectionData.grandTotal
                                  .pctCollectionMtd,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtPct(
                                targetCollectionData.grandTotal
                                  .pctCollectionYtd,
                              )
                            }}
                          </td>
                          <td class="tr">
                            {{
                              fmtNum(
                                targetCollectionData.grandTotal.piutangRealtime,
                              )
                            }}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <!-- ── Strip chip bulan ── -->
                  <div class="tc-month-strip">
                    <button
                      v-for="m in targetCollectionMonthChips"
                      :key="m.key"
                      class="tc-month-chip"
                      :class="{
                        'tc-month-chip--active':
                          m.key === selectedTargetCollectionKey,
                      }"
                      @click="fetchTargetCollection(m.bulan, m.tahun)"
                    >
                      {{ m.label }}
                    </button>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data target collection."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Baris 3: Panel utama 3 kolom ── -->
        <v-row dense>
          <!-- Panel Invoice Overdue -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-bad-soft);
                  color: var(--dsh-bad);
                  border-bottom: 1px solid var(--dsh-bad-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Invoice Jatuh Tempo
                <span class="panel-header-sub ml-1">(Overdue)</span>
                <span
                  v-if="piutangData.summary.overdueTotal"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-bad)"
                >
                  {{ piutangData.summary.overdueTotal }} Tagihan
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <!-- Aging Bucket -->
                  <div v-if="overdueList.length" class="aging-wrap">
                    <div
                      class="aging-chip aging-chip--a"
                      :title="`1–30 hari: Rp ${fmtNum(agingNominal.a)}`"
                    >
                      <span class="aging-count">{{ agingBuckets.a }}</span>
                      <span class="aging-label">1–30 hr</span>
                      <span class="aging-nominal">{{
                        shortNum(agingNominal.a)
                      }}</span>
                    </div>
                    <div
                      class="aging-chip aging-chip--b"
                      :title="`31–60 hari: Rp ${fmtNum(agingNominal.b)}`"
                    >
                      <span class="aging-count">{{ agingBuckets.b }}</span>
                      <span class="aging-label">31–60 hr</span>
                      <span class="aging-nominal">{{
                        shortNum(agingNominal.b)
                      }}</span>
                    </div>
                    <div
                      class="aging-chip aging-chip--c"
                      :title="`61–90 hari: Rp ${fmtNum(agingNominal.c)}`"
                    >
                      <span class="aging-count">{{ agingBuckets.c }}</span>
                      <span class="aging-label">61–90 hr</span>
                      <span class="aging-nominal">{{
                        shortNum(agingNominal.c)
                      }}</span>
                    </div>
                    <div
                      class="aging-chip aging-chip--d"
                      :title="`>90 hari: Rp ${fmtNum(agingNominal.d)}`"
                    >
                      <span class="aging-count">{{ agingBuckets.d }}</span>
                      <span class="aging-label">&gt;90 hr</span>
                      <span class="aging-nominal">{{
                        shortNum(agingNominal.d)
                      }}</span>
                    </div>
                  </div>

                  <!-- List overdue infinite scroll -->
                  <template v-if="overdueList.length || isLoadingMoreOverdue">
                    <div class="overdue-list" style="max-height: 380px">
                      <div
                        v-for="inv in overdueList"
                        :key="inv.Invoice"
                        class="overdue-item"
                        :class="
                          inv.TerlambatHari > 90
                            ? 'overdue-critical'
                            : inv.TerlambatHari > 60
                              ? 'overdue-high'
                              : inv.TerlambatHari > 30
                                ? 'overdue-mid'
                                : 'overdue-low'
                        "
                      >
                        <div class="pen-item-top">
                          <span class="pen-nomor text-error">{{
                            inv.Invoice
                          }}</span>
                          <span
                            class="pen-age"
                            :class="
                              inv.TerlambatHari > 90
                                ? 'umur-danger'
                                : inv.TerlambatHari > 30
                                  ? 'umur-warn'
                                  : 'umur-ok'
                            "
                          >
                            Telat {{ inv.TerlambatHari }}h
                          </span>
                        </div>
                        <div class="map-cus" style="font-size: 11px">
                          {{ inv.Customer }}
                        </div>
                        <div class="d-flex justify-space-between mt-1">
                          <span class="pen-ket"
                            >Jatuh Tempo: {{ inv.Tempo }}</span
                          >
                          <span
                            class="font-weight-bold text-error"
                            style="font-size: 12px"
                          >
                            Rp {{ fmtNum(inv.SisaTagihan) }}
                          </span>
                        </div>
                      </div>

                      <!-- Sentinel -->
                      <div
                        ref="overdueSentinelEl"
                        style="padding: 8px; text-align: center"
                      >
                        <span v-if="isLoadingMoreOverdue" class="pen-loading"
                          >Memuat...</span
                        >
                        <span
                          v-else-if="!overdueHasMore && overdueList.length"
                          class="pen-end"
                        >
                          {{ overdueList.length }} tagihan ditampilkan
                        </span>
                      </div>
                    </div>
                  </template>
                  <DashState
                    v-else
                    kind="empty"
                    message="Tidak ada invoice yang melewati jatuh tempo"
                  />
                </template>
              </div>
            </div>
          </v-col>

          <!-- Panel Top Piutang -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-accent-soft);
                  color: var(--dsh-accent);
                  border-bottom: 1px solid var(--dsh-accent-soft);
                "
              >
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Top Piutang Terbesar
              </div>
              <div class="panel-body pa-2">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <div class="knj-wrap" style="max-height: 450px">
                    <div
                      v-for="(top, i) in piutangData.top5"
                      :key="i"
                      class="knj-row"
                    >
                      <div class="knj-meta mb-1">
                        <span
                          class="knj-sales"
                          style="color: var(--dsh-accent)"
                          >{{ top.Customer }}</span
                        >
                        <span
                          class="knj-pct"
                          style="color: var(--dsh-accent); font-weight: 700"
                        >
                          {{ shortNum(top.Saldo) }}
                        </span>
                      </div>
                      <div class="knj-bar-wrap">
                        <div
                          class="knj-bar"
                          style="background: var(--dsh-accent-soft)"
                        >
                          <div
                            class="knj-seg"
                            style="background: var(--dsh-accent)"
                            :style="{
                              width: piutangData.top5[0]?.Saldo
                                ? (top.Saldo / piutangData.top5[0].Saldo) *
                                    100 +
                                  '%'
                                : '0%',
                            }"
                          />
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="piutangData.top5.length === 0"
                      class="text-center text-grey text-caption py-2"
                    >
                      Belum ada data piutang berjalan.
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </v-col>

          <!-- Panel Trend 6 Bulan -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-accent-soft);
                  color: var(--dsh-accent);
                  border-bottom: 1px solid var(--dsh-accent-soft);
                "
              >
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Trend Tagihan vs Penerimaan
                <span class="panel-header-sub ml-1">(6 bln)</span>
              </div>
              <div class="panel-body pa-3">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <div
                    class="knj-wrap"
                    style="
                      max-height: 450px;
                      overflow-y: auto;
                      overflow-x: hidden;
                    "
                  >
                    <div
                      v-for="(t, i) in piutangData.trend"
                      :key="i"
                      class="mb-3"
                    >
                      <div
                        class="d-flex justify-space-between align-center mb-1"
                      >
                        <span
                          class="font-weight-bold"
                          style="font-size: 11px; color: var(--dsh-ink)"
                        >
                          {{ t.Bulan }}
                        </span>
                      </div>
                      <div class="d-flex align-center gap-2 mb-1">
                        <div class="trend-lbl-mini text-primary">Tagihan</div>
                        <div class="trend-bar-bg">
                          <div
                            class="trend-fill bg-primary"
                            :style="{
                              width: Math.max(t.TotalTagihan, t.TotalPenerimaan)
                                ? (t.TotalTagihan /
                                    Math.max(
                                      t.TotalTagihan,
                                      t.TotalPenerimaan,
                                    )) *
                                    100 +
                                  '%'
                                : '0%',
                            }"
                          />
                        </div>
                        <div class="trend-val-mini">
                          {{ shortNum(t.TotalTagihan) }}
                        </div>
                      </div>
                      <div class="d-flex align-center gap-2">
                        <div class="trend-lbl-mini text-success">Terima</div>
                        <div class="trend-bar-bg">
                          <div
                            class="trend-fill bg-success"
                            :style="{
                              width: Math.max(t.TotalTagihan, t.TotalPenerimaan)
                                ? (t.TotalPenerimaan /
                                    Math.max(
                                      t.TotalTagihan,
                                      t.TotalPenerimaan,
                                    )) *
                                    100 +
                                  '%'
                                : '0%',
                            }"
                          />
                        </div>
                        <div class="trend-val-mini">
                          {{ shortNum(t.TotalPenerimaan) }}
                        </div>
                      </div>
                      <v-divider
                        v-if="i !== piutangData.trend.length - 1"
                        class="mt-2"
                        color="var(--dsh-fill)"
                      />
                    </div>
                    <div
                      v-if="piutangData.trend.length === 0"
                      class="text-center text-grey text-caption py-2"
                    >
                      Belum ada data trend.
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mt-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-warn-soft);
                  color: var(--dsh-warn);
                  border-bottom: 1px solid var(--dsh-warn-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                SPK Terkirim Belum Ditagih
                <span class="panel-header-sub ml-1">(piutang tersembunyi)</span>
                <span
                  v-if="
                    spkBelumTagihSummary.BelumInvoice +
                    spkBelumTagihSummary.SebagianInvoice
                  "
                  class="badge-count ml-auto"
                  style="background: var(--dsh-warn)"
                >
                  {{
                    spkBelumTagihSummary.BelumInvoice +
                    spkBelumTagihSummary.SebagianInvoice
                  }}
                  SPK
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-primary">{{
                        spkBelumTagihSummary.TotalTerkirim
                      }}</span>
                      <span class="pen-stat-lbl">Total Terkirim</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-error">{{
                        spkBelumTagihSummary.BelumInvoice
                      }}</span>
                      <span class="pen-stat-lbl">Belum Invoice</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val"
                        style="color: var(--dsh-warn)"
                        >{{ spkBelumTagihSummary.SebagianInvoice }}</span
                      >
                      <span class="pen-stat-lbl">Sebagian</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-success">{{
                        spkBelumTagihSummary.FullInvoice
                      }}</span>
                      <span class="pen-stat-lbl">Full Invoice</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val"
                        style="color: var(--dsh-warn)"
                        >{{
                          fmtNum(spkBelumTagihSummary.TotalQtyBelumDitagih)
                        }}</span
                      >
                      <span class="pen-stat-lbl">Qty Belum Ditagih</span>
                    </div>
                  </div>

                  <div
                    v-if="spkBelumTagihList.length || isLoadingMoreSpkTagih"
                    class="gb-list"
                    style="max-height: 320px"
                  >
                    <div
                      v-for="s in spkBelumTagihList"
                      :key="s.Nomor"
                      class="gb-row"
                      :class="s.QtyInvoice === 0 ? 'row-minus' : ''"
                    >
                      <div class="gb-nama" :title="s.Nama" style="width: 150px">
                        <span class="pen-nomor">{{ s.Nomor }}</span>
                      </div>
                      <div class="gb-bar-wrap">
                        <span class="pen-cus" style="flex: 1"
                          >{{ s.NamaCustomer }} · Kirim
                          {{ s.TglKirimTerakhir }} ({{ s.UmurHari }}h)</span
                        >
                        <span
                          style="
                            font-size: 10px;
                            font-weight: 700;
                            color: var(--dsh-warn);
                          "
                        >
                          Belum {{ fmtNum(s.QtyBelumDitagih) }} /
                          {{ fmtNum(s.QtyKirim) }}
                        </span>
                      </div>
                    </div>
                    <div ref="spkTagihSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreSpkTagih" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!spkTagihHasMore && spkBelumTagihList.length"
                        class="pen-end"
                      >
                        {{ spkBelumTagihList.length }} SPK ditampilkan
                      </span>
                    </div>
                  </div>
                  <DashState
                    v-else
                    kind="empty"
                    message="Semua SPK terkirim sudah full invoice"
                  />
                </template>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ════════════════════════════════════════
     TAB GUDANG BAHAN
════════════════════════════════════════ -->
      <v-window-item value="gudang-bahan">
        <!-- Metric cards -->
        <v-row dense class="mb-3">
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Total bahan penolong</div>
              <div class="sum-value text-primary">
                <span v-if="isLoadingGudangBahan">—</span>
                <span v-else>{{
                  fmtNum(gudangBahanData.metric.TotalJenis)
                }}</span>
              </div>
              <div class="sum-sub">aksesori garmen aktif (tgarmen_brg)</div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Bahan penolong bawah buffer</div>
              <div class="sum-value text-error">
                <span v-if="isLoadingGudangBahan">—</span>
                <span v-else>{{ gudangBahanData.metric.JmlBawahBuffer }}</span>
              </div>
              <div class="sum-sub">aksesori perlu reorder segera</div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Total barcode bahan utama</div>
              <div class="sum-value text-success">
                <span v-if="isLoadingGudangBahan">—</span>
                <span v-else>{{
                  fmtNum(gudangBahanData.metric.TotalBarcode)
                }}</span>
              </div>
              <div class="sum-sub">roll/lot bahan kain di sistem</div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Bahan utama stok minus</div>
              <div class="sum-value" style="color: var(--dsh-warn)">
                <span v-if="isLoadingGudangBahan">—</span>
                <span v-else>{{ gudangBahanData.metric.JmlMinus }}</span>
              </div>
              <div class="sum-sub">stok negatif perlu investigasi</div>
            </div>
          </v-col>
        </v-row>

        <!-- ══ ACTIONABLE — di atas monitoring buffer ══ -->
        <v-row dense class="mb-2">
          <!-- a. MAP/SPK belum ada Permintaan & Realisasi Bahan -->
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-bad-soft);
                  color: var(--dsh-bad);
                  border-bottom: 1px solid var(--dsh-bad-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                MAP/SPK Belum Ada Permintaan &amp; Realisasi Bahan
                <span
                  v-if="mapSpkBelumPermintaanSummary.total"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-bad)"
                >
                  {{ mapSpkBelumPermintaanSummary.total }}
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template
                  v-else-if="
                    mapSpkBelumPermintaanList.length || isLoadingMoreMsp
                  "
                >
                  <div class="pen-list" style="max-height: 320px">
                    <div
                      v-for="item in mapSpkBelumPermintaanList"
                      :key="item.Nomor"
                      class="pen-item"
                      :class="
                        item.SisaHari < 0
                          ? 'umur-danger'
                          : item.SisaHari <= 3
                            ? 'umur-warn'
                            : ''
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ item.Nomor }}</span>
                        <div class="d-flex align-center" style="gap: 5px">
                          <span class="pen-divisi">{{ item.Sumber }}</span>
                          <span
                            class="pen-age"
                            :class="
                              item.SisaHari < 0
                                ? 'umur-danger'
                                : item.SisaHari <= 3
                                  ? 'umur-warn'
                                  : 'umur-ok'
                            "
                          >
                            {{
                              item.SisaHari < 0 ? "Lewat" : item.SisaHari + "h"
                            }}
                          </span>
                        </div>
                      </div>
                      <div class="pen-cus">{{ item.Nama }}</div>
                      <div class="pen-ket">Dateline: {{ item.Dateline }}</div>
                    </div>
                    <div ref="mspSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreMsp" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="
                          !mspHasMore && mapSpkBelumPermintaanList.length
                        "
                        class="pen-end"
                      >
                        {{ mapSpkBelumPermintaanList.length }} item ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua MAP/SPK sudah ada permintaan atau realisasi bahan"
                />
              </div>
            </div>
          </v-col>

          <!-- b. Permintaan Bahan belum direalisasi -->
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--warning">
                <IconFileAlert :size="14" :stroke-width="1.7" class="mr-1" />
                Permintaan Bahan Belum Direalisasi
                <span
                  v-if="permintaanBelumRealisasiSummary.Total"
                  class="badge-count ml-auto"
                >
                  {{ permintaanBelumRealisasiSummary.Total }}
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template
                  v-else-if="
                    permintaanBelumRealisasiList.length || isLoadingMorePbr
                  "
                >
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-error">{{
                        permintaanBelumRealisasiSummary.BelumSamaSekali
                      }}</span>
                      <span class="pen-stat-lbl">Belum Sama Sekali</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val"
                        style="color: var(--dsh-warn)"
                        >{{ permintaanBelumRealisasiSummary.Sebagian }}</span
                      >
                      <span class="pen-stat-lbl">Sebagian</span>
                    </div>
                  </div>
                  <div class="pen-list" style="max-height: 260px">
                    <div
                      v-for="item in permintaanBelumRealisasiList"
                      :key="item.Nomor"
                      class="pen-item"
                      :class="
                        item.Status === 'Belum' ? 'umur-danger' : 'umur-warn'
                      "
                      style="cursor: pointer"
                      @click="
                        router.push({
                          path: '/garmen/bahan-baku/realisasi-minta/form',
                          query: { minta: item.Nomor },
                        })
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ item.Nomor }}</span>
                        <span
                          class="pen-age"
                          :class="
                            item.Status === 'Belum'
                              ? 'umur-danger'
                              : 'umur-warn'
                          "
                        >
                          {{ item.Status }}
                        </span>
                      </div>
                      <div class="pen-cus">{{ item.NamaSpk || item.Spk }}</div>
                      <div class="pen-ket">
                        {{ item.Cab }} · {{ item.Tanggal }} ·
                        {{ item.UmurHari }}h
                      </div>
                    </div>
                    <div ref="pbrSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMorePbr" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="
                          !pbrHasMore && permintaanBelumRealisasiList.length
                        "
                        class="pen-end"
                      >
                        {{ permintaanBelumRealisasiList.length }} permintaan
                        ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua permintaan bahan sudah direalisasi"
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mb-2">
          <!-- d. SO Belum Ada MKB -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--warning">
                <IconFileAlert :size="14" :stroke-width="1.7" class="mr-1" />
                SO Belum Ada MKB
                <span v-if="gbSpkBelumMkbCount" class="badge-count ml-auto">{{
                  gbSpkBelumMkbCount
                }}</span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template
                  v-else-if="gbSpkBelumMkbList.length || isLoadingMoreGbMkb"
                >
                  <div class="pen-list" style="max-height: 320px">
                    <div
                      v-for="s in gbSpkBelumMkbList"
                      :key="s.Nomor"
                      class="pen-item"
                      :class="
                        s.SisaHari < 0
                          ? 'umur-danger'
                          : s.SisaHari <= 3
                            ? 'umur-warn'
                            : ''
                      "
                      style="cursor: pointer"
                      @click="
                        router.push('/laporan/gudang-garmen/spk-belum-mkb')
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ s.Nomor }}</span>
                        <span
                          class="pen-age"
                          :class="
                            s.SisaHari < 0
                              ? 'umur-danger'
                              : s.SisaHari <= 3
                                ? 'umur-warn'
                                : 'umur-ok'
                          "
                        >
                          {{ s.SisaHari < 0 ? "Lewat" : s.SisaHari + "h" }}
                        </span>
                      </div>
                      <div class="pen-cus">{{ s.Nama }}</div>
                      <div class="pen-ket">Dateline: {{ s.Dateline }}</div>
                    </div>
                    <div ref="gbMkbSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreGbMkb" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!gbMkbHasMore && gbSpkBelumMkbList.length"
                        class="pen-end"
                      >
                        {{ gbSpkBelumMkbList.length }} SO ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua SO bulan ini sudah ada MKB"
                />
              </div>
            </div>
          </v-col>

          <!-- e. MKA Belum Direalisasi -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-warn-soft);
                  color: var(--dsh-warn);
                  border-bottom: 1px solid var(--dsh-warn-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                MKA Belum Direalisasi
                <span
                  v-if="gbStokAccVsMkaCount"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-warn)"
                >
                  {{ gbStokAccVsMkaCount }}
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template
                  v-else-if="gbStokAccVsMkaList.length || isLoadingMoreGbMka"
                >
                  <div
                    class="gb-list"
                    style="max-height: 340px; overflow-y: auto"
                  >
                    <div
                      v-for="item in gbStokAccVsMkaList"
                      :key="item.Kode"
                      class="bk-row"
                    >
                      <div
                        class="gb-row"
                        style="cursor: pointer"
                        @click="
                          router.push('/laporan/gudang-garmen/stok-acc-vs-mka')
                        "
                      >
                        <div
                          class="gb-nama"
                          :title="item.Nama"
                          style="
                            width: 150px;
                            white-space: normal;
                            line-height: 1.3;
                          "
                        >
                          {{ item.Nama }}
                        </div>
                        <div class="gb-bar-wrap">
                          <span class="pen-cus" style="flex: 1">
                            Stok {{ fmtNum(item.StokAcc) }} / Kebutuhan
                            {{ fmtNum(item.Mka) }} {{ item.Satuan }}
                          </span>
                          <span
                            style="
                              font-size: 10px;
                              font-weight: 700;
                              color: var(--dsh-warn);
                            "
                          >
                            Kurang {{ fmtNum(Math.abs(item.Free)) }}
                          </span>
                        </div>
                      </div>
                      <div class="bk-bahan-list">
                        <div
                          v-for="(s, i) in item.spkList"
                          :key="i"
                          class="bk-bahan-item"
                        >
                          <span class="bk-bahan-nama"
                            >{{ s.NomorMka }} · {{ s.Spk }} —
                            {{ s.NamaSpk }}</span
                          >
                          <span class="bk-bahan-kurang"
                            >sisa {{ fmtNum(s.Sisa) }}</span
                          >
                        </div>
                      </div>
                    </div>
                    <div ref="gbMkaSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreGbMka" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!gbMkaHasMore && gbStokAccVsMkaList.length"
                        class="pen-end"
                      >
                        {{ gbStokAccVsMkaList.length }} item ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua aksesoris tercukupi untuk kebutuhan MKA"
                />
              </div>
            </div>
          </v-col>

          <!-- c. PO Bahan Belum Datang -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--teal">
                <IconTruckDelivery
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                PO Bahan Belum Datang
                <span
                  v-if="poBahanBelumDatangSummary.total"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-accent)"
                >
                  {{ poBahanBelumDatangSummary.total }}
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template
                  v-else-if="poBahanBelumDatangList.length || isLoadingMorePbd"
                >
                  <div class="pen-list" style="max-height: 320px">
                    <div
                      v-for="po in poBahanBelumDatangList"
                      :key="po.Nomor"
                      class="pen-item"
                      :class="
                        po.Status === 'OPEN' ? 'umur-danger' : 'umur-warn'
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ po.Nomor }}</span>
                        <span
                          class="pen-age"
                          :class="
                            po.Status === 'OPEN' ? 'umur-danger' : 'umur-warn'
                          "
                        >
                          {{ po.Status }}
                        </span>
                      </div>
                      <div class="pen-cus">{{ po.Supplier || "-" }}</div>
                      <div class="pen-ket">
                        {{ po.Tanggal }} · {{ po.UmurHari }}h
                      </div>
                    </div>
                    <div ref="pbdSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMorePbd" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!pbdHasMore && poBahanBelumDatangList.length"
                        class="pen-end"
                      >
                        {{ poBahanBelumDatangList.length }} PO ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua PO bahan sudah selesai diterima"
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Panel row 1: Buffer alert + Top stok -->
        <v-row dense class="mb-2">
          <!-- Stok di bawah buffer -->
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-warn-soft);
                  color: var(--dsh-warn);
                  border-bottom: 1px solid var(--dsh-warn-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Bahan penolong di bawah buffer
                <span
                  v-if="gudangBahanData.metric.JmlBawahBuffer"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-warn)"
                >
                  {{ gudangBahanData.metric.JmlBawahBuffer }} item
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template v-else-if="bufferList.length || isLoadingMoreBuffer">
                  <div class="gb-list">
                    <div
                      v-for="item in bufferList"
                      :key="item.Kode"
                      class="gb-row"
                    >
                      <div class="gb-nama" :title="item.Nama">
                        {{ item.Nama }}
                      </div>
                      <div class="gb-bar-wrap">
                        <div class="gb-bar-track">
                          <div
                            class="gb-bar-fill"
                            :style="{
                              width:
                                bufferPct(item.StokAkhir, item.Buffer) + '%',
                              background: bufferColor(
                                bufferPct(item.StokAkhir, item.Buffer),
                              ),
                            }"
                          />
                        </div>
                        <span
                          class="gb-bar-val"
                          :style="{
                            color: bufferColor(
                              bufferPct(item.StokAkhir, item.Buffer),
                            ),
                          }"
                        >
                          {{ fmtNum(item.StokAkhir) }} /
                          {{ fmtNum(item.Buffer) }} {{ item.Satuan }}
                        </span>
                      </div>
                      <span
                        class="gb-pct"
                        :style="{
                          color: bufferColor(
                            bufferPct(item.StokAkhir, item.Buffer),
                          ),
                        }"
                      >
                        {{ bufferPct(item.StokAkhir, item.Buffer) }}%
                      </span>
                    </div>

                    <!-- Sentinel -->
                    <div
                      ref="bufferSentinelEl"
                      style="padding: 6px; text-align: center"
                    >
                      <span v-if="isLoadingMoreBuffer" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!bufferHasMore && bufferList.length"
                        class="pen-end"
                      >
                        {{ bufferList.length }} item ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua stok di atas buffer"
                />
              </div>
            </div>
          </v-col>

          <!-- Top stok terbesar -->
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--blue">
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Top stok bahan penolong terbesar
                <span class="panel-header-sub ml-1">(aksesori)</span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template v-else-if="gudangBahanData.topStok.length">
                  <div class="gb-list">
                    <div
                      v-for="item in gudangBahanData.topStok"
                      :key="item.Kode"
                      class="gb-row"
                    >
                      <div class="gb-nama" :title="item.Nama">
                        {{ item.Nama }}
                      </div>
                      <div class="gb-bar-wrap">
                        <div class="gb-bar-track">
                          <div
                            class="gb-bar-fill"
                            :style="{
                              width: gudangBahanData.topStok[0]?.StokAkhir
                                ? (item.StokAkhir /
                                    gudangBahanData.topStok[0].StokAkhir) *
                                    100 +
                                  '%'
                                : '0%',
                              background: 'var(--dsh-accent)',
                            }"
                          />
                        </div>
                        <span class="gb-bar-val">
                          {{ fmtNum(item.StokAkhir) }} {{ item.Satuan }}
                        </span>
                      </div>
                    </div>
                  </div>
                </template>
                <DashState v-else kind="empty" message="Belum ada data stok." />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Panel: Monitoring Buffer Bahan & Aksesoris KAOSAN ── -->
        <v-row dense class="mb-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-warn-soft);
                  color: var(--dsh-warn);
                  border-bottom: 1px solid var(--dsh-warn-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Buffer Bahan &amp; Aksesoris KAOSAN
                <span class="panel-header-sub ml-1">(di bawah buffer)</span>
                <span
                  v-if="bufferKaosanSummary.total"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-warn)"
                >
                  {{ bufferKaosanSummary.total }} item
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template
                  v-else-if="bufferKaosanList.length || isLoadingMoreBk"
                >
                  <div class="gb-list" style="max-height: 320px">
                    <div
                      v-for="item in bufferKaosanList"
                      :key="item.Tipe + item.Kode"
                      class="gb-row"
                    >
                      <div
                        class="gb-nama"
                        :title="item.Nama"
                        style="width: 200px"
                      >
                        <span
                          style="
                            font-size: 9px;
                            font-weight: 700;
                            padding: 0 4px;
                            border-radius: 2px;
                            margin-right: 4px;
                          "
                          :style="{
                            background:
                              item.Tipe === 'BAHAN'
                                ? 'var(--dsh-accent-soft)'
                                : 'var(--dsh-accent-soft)',
                            color:
                              item.Tipe === 'BAHAN'
                                ? 'var(--dsh-accent)'
                                : 'var(--dsh-accent)',
                          }"
                        >
                          {{ item.Tipe === "BAHAN" ? "BHN" : "ACC" }}
                        </span>
                        {{ item.Nama }}
                      </div>
                      <div class="gb-bar-wrap">
                        <div class="gb-bar-track">
                          <div
                            class="gb-bar-fill"
                            :style="{
                              width:
                                bufferPct(item.StokAkhir, item.Buffer) + '%',
                              background: bufferColor(
                                bufferPct(item.StokAkhir, item.Buffer),
                              ),
                            }"
                          />
                        </div>
                        <span
                          class="gb-bar-val"
                          :style="{
                            color: bufferColor(
                              bufferPct(item.StokAkhir, item.Buffer),
                            ),
                          }"
                        >
                          {{ fmtNum(item.StokAkhir) }} /
                          {{ fmtNum(item.Buffer) }} {{ item.Satuan }}
                        </span>
                      </div>
                      <span
                        class="gb-pct"
                        :style="{
                          color: bufferColor(
                            bufferPct(item.StokAkhir, item.Buffer),
                          ),
                        }"
                      >
                        {{ bufferPct(item.StokAkhir, item.Buffer) }}%
                      </span>
                    </div>
                    <div
                      ref="bkSentinelEl"
                      style="padding: 6px; text-align: center"
                    >
                      <span v-if="isLoadingMoreBk" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!bkHasMore && bufferKaosanList.length"
                        class="pen-end"
                      >
                        {{ bufferKaosanList.length }} item ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua bahan &amp; aksesoris KAOSAN di atas buffer"
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Panel: Stok Aksesoris vs Kebutuhan MKA ── -->
        <v-row dense class="mb-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-warn-soft);
                  color: var(--dsh-warn);
                  border-bottom: 1px solid var(--dsh-warn-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Stok Aksesoris vs Kebutuhan MKA
                <span class="panel-header-sub ml-1"
                  >(kekurangan, bulan ini)</span
                >
                <span
                  v-if="stokAccVsMkaCount"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-warn)"
                >
                  {{ stokAccVsMkaCount }} item
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template
                  v-else-if="
                    stokAccVsMkaList.length || isLoadingMoreStokAccVsMka
                  "
                >
                  <div class="gb-list">
                    <div
                      v-for="item in stokAccVsMkaList"
                      :key="item.Kode"
                      class="bk-row"
                    >
                      <div
                        class="gb-row"
                        style="cursor: pointer"
                        @click="
                          router.push('/laporan/gudang-garmen/stok-acc-vs-mka')
                        "
                      >
                        <div
                          class="gb-nama"
                          :title="item.Nama"
                          style="
                            width: 220px;
                            white-space: normal;
                            line-height: 1.3;
                          "
                        >
                          {{ item.Nama }}
                        </div>
                        <div class="gb-bar-wrap">
                          <span class="pen-cus" style="flex: 1">
                            Stok {{ fmtNum(item.StokAcc) }} / Kebutuhan
                            {{ fmtNum(item.Mka) }} {{ item.Satuan }}
                          </span>
                          <span
                            style="
                              font-size: 10px;
                              font-weight: 700;
                              color: var(--dsh-warn);
                            "
                          >
                            Kurang {{ fmtNum(Math.abs(item.Free)) }}
                          </span>
                        </div>
                      </div>
                      <div class="bk-bahan-list">
                        <div
                          v-for="(s, i) in item.spkList"
                          :key="i"
                          class="bk-bahan-item"
                        >
                          <span class="bk-bahan-nama"
                            >{{ s.Spk }} — {{ s.NamaSpk }}</span
                          >
                          <span class="bk-bahan-kurang">
                            sisa {{ fmtNum(s.Sisa) }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div ref="stokAccVsMkaSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreStokAccVsMka" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="
                          !stokAccVsMkaHasMore && stokAccVsMkaList.length
                        "
                        class="pen-end"
                      >
                        {{ stokAccVsMkaList.length }} item ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua aksesoris tercukupi untuk kebutuhan MKA bulan ini"
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mb-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-fill);
                  color: var(--dsh-ink);
                  border-bottom: 1px solid var(--dsh-line);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Stok Slow Moving & Dead Stock
                <span class="panel-header-sub ml-1">(per jenis bahan)</span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template v-else-if="slowDeadStockData.length">
                  <div
                    v-if="konversiBabaranData.length"
                    class="d-flex flex-wrap"
                    style="
                      gap: 0;
                      border-bottom: 1px solid var(--dsh-fill);
                      background: var(--dsh-fill);
                    "
                  >
                    <div
                      v-for="k in konversiBabaranData"
                      :key="k.kategori"
                      class="pen-stat"
                      style="padding: 8px 4px"
                    >
                      <span
                        class="pen-stat-val text-primary"
                        style="font-size: 15px"
                      >
                        {{ fmtDec(k.pcsPerKg, 1) }} pcs/kg
                      </span>
                      <span class="pen-stat-lbl">{{ k.label }}</span>
                    </div>
                  </div>
                  <v-expansion-panels variant="accordion" multiple>
                    <v-expansion-panel
                      v-for="grp in slowDeadStockPaged"
                      :key="grp.jenisNama"
                    >
                      <v-expansion-panel-title
                        style="min-height: 40px; padding: 8px 12px"
                      >
                        <div
                          style="
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            font-size: 11px;
                            flex-wrap: wrap;
                          "
                        >
                          <span
                            style="font-weight: 700; color: var(--dsh-ink)"
                            >{{ grp.jenisNama }}</span
                          >
                          <span
                            v-if="grp.jmlSlowmoving"
                            class="badge-count"
                            style="background: var(--dsh-warn)"
                          >
                            Slowmoving {{ grp.jmlSlowmoving }}
                          </span>
                          <span
                            v-if="grp.jmlDeadStock"
                            class="badge-count"
                            style="background: var(--dsh-bad)"
                          >
                            Dead Stock {{ grp.jmlDeadStock }}
                          </span>
                          <span style="color: var(--dsh-ink-3)">
                            Total stok:
                            <template
                              v-for="(t, i) in grp.totalStokList"
                              :key="t.satuan"
                            >
                              {{ i > 0 ? ", " : "" }}{{ fmtNum(t.stok) }}
                              {{ t.satuan }}
                            </template>
                          </span>
                        </div>
                      </v-expansion-panel-title>
                      <v-expansion-panel-text style="padding: 0">
                        <div style="overflow-x: auto">
                          <table class="gb-tbl">
                            <thead>
                              <tr>
                                <th>Nama Bahan</th>
                                <th class="tr">Stok</th>
                                <th class="tr">Umur (hr)</th>
                                <th class="tc">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="item in grp.items" :key="item.Kode">
                                <td>{{ item.Nama || item.Kode }}</td>
                                <td class="tr">
                                  {{ fmtNum(item.Stok) }} {{ item.Satuan }}
                                </td>
                                <td class="tr">{{ item.UmurHari }}</td>
                                <td class="tc">
                                  <span
                                    class="gb-badge"
                                    :class="
                                      item.Status === 'Dead Stock'
                                        ? 'gb-badge--danger'
                                        : 'gb-badge--warn'
                                    "
                                  >
                                    {{ item.Status }}
                                  </span>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                    <div
                      v-if="slowDeadStockTotalPages > 1"
                      class="d-flex align-center justify-center"
                      style="
                        gap: 10px;
                        padding: 8px 12px;
                        border-top: 1px solid var(--dsh-fill);
                      "
                    >
                      <button
                        class="knj-detail-btn"
                        :disabled="slowDeadStockPage === 1"
                        :style="{ opacity: slowDeadStockPage === 1 ? 0.4 : 1 }"
                        @click="slowDeadStockPage--"
                      >
                        ← Sebelumnya
                      </button>
                      <span style="font-size: 11px; color: var(--dsh-ink-2)">
                        Halaman {{ slowDeadStockPage }} dari
                        {{ slowDeadStockTotalPages }} ({{
                          slowDeadStockData.length
                        }}
                        jenis bahan)
                      </span>
                      <button
                        class="knj-detail-btn"
                        :disabled="
                          slowDeadStockPage === slowDeadStockTotalPages
                        "
                        :style="{
                          opacity:
                            slowDeadStockPage === slowDeadStockTotalPages
                              ? 0.4
                              : 1,
                        }"
                        @click="slowDeadStockPage++"
                      >
                        Berikutnya →
                      </button>
                    </div>
                  </v-expansion-panels>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Tidak ada bahan slow moving atau dead stock"
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Panel: Stok Bebas (Free Stock) ── -->
        <v-row dense class="mb-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-bad-soft);
                  color: var(--dsh-bad);
                  border-bottom: 1px solid var(--dsh-bad-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Stok Bebas (Free Stock)
                <span class="panel-header-sub ml-1"
                  >(Stok − kebutuhan MKB belum realisasi)</span
                >
                <span
                  v-if="stokBebasSummary.total"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-bad)"
                >
                  {{ stokBebasSummary.total }} kekurangan
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template v-else-if="stokBebasList.length || isLoadingMoreSb">
                  <div
                    style="
                      overflow-x: auto;
                      max-height: 320px;
                      overflow-y: auto;
                    "
                  >
                    <table class="gb-tbl">
                      <thead>
                        <tr>
                          <th>Nama bahan</th>
                          <th class="tr">Stok</th>
                          <th class="tr">Kebutuhan MKB</th>
                          <th class="tr">Free</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in stokBebasList" :key="item.Kode">
                          <td
                            :title="item.Nama"
                            style="
                              max-width: 220px;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              white-space: nowrap;
                            "
                          >
                            {{ item.Nama || item.Kode }}
                          </td>
                          <td class="tr">{{ fmtNum(item.Stok) }}</td>
                          <td class="tr" style="color: var(--dsh-warn)">
                            {{ fmtNum(item.MkbBelumRealisasi) }}
                          </td>
                          <td
                            class="tr"
                            style="font-weight: 700; color: var(--dsh-bad)"
                          >
                            {{ fmtNum(item.Free) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    <div
                      ref="sbSentinelEl"
                      style="padding: 6px; text-align: center"
                    >
                      <span v-if="isLoadingMoreSb" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!sbHasMore && stokBebasList.length"
                        class="pen-end"
                      >
                        {{ stokBebasList.length }} bahan ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Tidak ada bahan dengan stok bebas negatif"
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Panel row 3: Stok bahan barcode -->
        <v-row dense>
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--teal">
                <IconPackage :size="14" :stroke-width="1.7" class="mr-1" />
                Stok bahan utama (barcode)
                <span class="panel-header-sub ml-1"
                  >masuk / keluar / saldo per jenis</span
                >
                <button
                  class="po-bpb-link ml-auto"
                  @click="
                    router.push('/laporan/gudang-garmen/stok-bahan-barcode')
                  "
                >
                  Lihat Detail →
                </button>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingGudangBahan" kind="loading" />
                <template v-else-if="bahanList.length || isLoadingMoreBahan">
                  <div
                    style="
                      overflow-x: auto;
                      max-height: 400px;
                      overflow-y: auto;
                    "
                  >
                    <table class="gb-tbl">
                      <thead>
                        <tr>
                          <th>Nama bahan</th>
                          <th class="tr">Masuk</th>
                          <th class="tr">Keluar</th>
                          <th class="tr">Stok</th>
                          <th class="tc">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="item in bahanList" :key="item.Kode">
                          <td
                            :title="item.Nama"
                            style="
                              max-width: 220px;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              white-space: nowrap;
                            "
                          >
                            {{ item.Nama || item.Kode }}
                          </td>
                          <td class="tr" style="color: var(--dsh-good)">
                            +{{ fmtNum(item.Masuk) }}
                          </td>
                          <td class="tr" style="color: var(--dsh-bad)">
                            -{{ fmtNum(item.Keluar) }}
                          </td>
                          <td
                            class="tr"
                            :style="{
                              fontWeight: '600',
                              color:
                                item.Stok < 0
                                  ? 'var(--dsh-bad)'
                                  : item.Stok === 0
                                    ? 'var(--dsh-warn)'
                                    : 'var(--dsh-ink)',
                            }"
                          >
                            {{ fmtNum(item.Stok) }}
                          </td>
                          <td class="tc">
                            <span
                              v-if="item.Stok < 0"
                              class="gb-badge gb-badge--danger"
                              >Minus</span
                            >
                            <span
                              v-else-if="item.Stok === 0"
                              class="gb-badge gb-badge--warn"
                              >Nol</span
                            >
                            <span
                              v-else-if="item.Buffer && item.Stok < item.Buffer"
                              class="gb-badge gb-badge--warn"
                              >Bawah buffer</span
                            >
                            <span v-else class="gb-badge gb-badge--ok"
                              >Aman</span
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <!-- Sentinel di luar tabel tapi dalam scroll wrapper -->
                    <div
                      ref="bahanSentinelEl"
                      style="padding: 6px; text-align: center"
                    >
                      <span v-if="isLoadingMoreBahan" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!bahanHasMore && bahanList.length"
                        class="pen-end"
                      >
                        {{ bahanList.length }} bahan ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data bahan barcode."
                />
              </div>
            </div>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ════════════════════════════════════════
           TAB GUDANG GARMEN
      ════════════════════════════════════════ -->
      <v-window-item value="gudang">
        <!-- ── Alur produksi: SPK → Invoice ── -->
        <v-row dense class="mt-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--blue">
                <IconTrendingUp :size="14" :stroke-width="1.7" class="mr-1" />
                Alur produksi
                <span class="panel-header-sub ml-1"
                  >(SPK dengan dateline {{ pipelineFilter.startDate }} s.d
                  {{ pipelineFilter.endDate }})</span
                >
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" :rows="2" />
                <ProductionFlow
                  v-else-if="pipelineData.TotalMasuk"
                  :stages="productionFlowStages"
                />
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada SPK dengan dateline pada periode ini."
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row: Alert Bahan Kurang ── -->
        <v-row dense class="mt-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-bad-soft);
                  color: var(--dsh-bad);
                  border-bottom: 1px solid var(--dsh-bad-soft);
                "
              >
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Bahan Kurang untuk Produksi
                <span
                  v-if="bahanKurangSummary.total"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-bad)"
                >
                  {{ bahanKurangSummary.total }} SPK
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template
                  v-else-if="bahanKurangList.length || isLoadingMoreBahanKurang"
                >
                  <div class="gb-list" style="max-height: 320px">
                    <div
                      v-for="item in bahanKurangList"
                      :key="item.Nomor"
                      class="bk-row"
                    >
                      <div
                        class="gb-row"
                        style="cursor: pointer"
                        @click="
                          router.push(
                            '/laporan/gudang-garmen/spk-mkb-vs-po-bpb',
                          )
                        "
                      >
                        <div
                          class="gb-nama"
                          :title="item.NamaSpk"
                          style="width: 160px"
                        >
                          <span class="pen-nomor">{{ item.Nomor }}</span>
                        </div>
                        <div class="gb-bar-wrap">
                          <span class="pen-cus" style="flex: 1">{{
                            item.NamaSpk
                          }}</span>
                          <span
                            style="
                              font-size: 10px;
                              font-weight: 700;
                              color: var(--dsh-bad);
                            "
                          >
                            {{ item.JmlBahanKurang }} bahan
                          </span>
                        </div>
                      </div>
                      <div class="bk-bahan-list">
                        <div
                          v-for="(b, i) in item.bahanList"
                          :key="i"
                          class="bk-bahan-item"
                        >
                          <span class="bk-bahan-nama">{{
                            b.NamaBahan || b.Kode
                          }}</span>
                          <span class="bk-bahan-kurang">
                            kurang {{ fmtDec(b.Kurang) }} {{ b.Satuan }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div ref="bahanKurangSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreBahanKurang" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="
                          !bahanKurangHasMore && bahanKurangList.length
                        "
                        class="pen-end"
                      >
                        {{ bahanKurangList.length }} SPK ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua kebutuhan bahan produksi tercukupi"
                />
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row: SPK Belum MKB | (PO Bahan vs BPB + PO Jasa vs BPB Jasa stacked) ── -->
        <v-row dense class="mt-2">
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--warning">
                <IconFileAlert :size="14" :stroke-width="1.7" class="mr-1" />
                SO Belum Ada MKB
                <span v-if="spkBelumMkbCountVal" class="badge-count ml-auto">
                  {{ spkBelumMkbCountVal }}
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template
                  v-else-if="spkBelumMkbList.length || isLoadingMoreSpkBelumMkb"
                >
                  <div class="pen-list" style="max-height: 400px">
                    <div
                      v-for="s in spkBelumMkbList"
                      :key="s.Nomor"
                      class="pen-item"
                      :class="
                        s.SisaHari < 0
                          ? 'umur-danger'
                          : s.SisaHari <= 3
                            ? 'umur-warn'
                            : ''
                      "
                      style="cursor: pointer"
                      @click="
                        router.push('/laporan/gudang-garmen/spk-belum-mkb')
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ s.Nomor }}</span>
                        <span
                          class="pen-age"
                          :class="
                            s.SisaHari < 0
                              ? 'umur-danger'
                              : s.SisaHari <= 3
                                ? 'umur-warn'
                                : 'umur-ok'
                          "
                        >
                          {{ s.SisaHari < 0 ? "Lewat" : s.SisaHari + "h" }}
                        </span>
                      </div>
                      <div class="pen-cus">{{ s.Nama }}</div>
                      <div class="pen-ket">Dateline: {{ s.Dateline }}</div>
                    </div>
                    <div ref="spkBelumMkbSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreSpkBelumMkb" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="
                          !spkBelumMkbHasMore && spkBelumMkbList.length
                        "
                        class="pen-end"
                      >
                        {{ spkBelumMkbList.length }} SPK ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Semua SPK bulan ini sudah ada MKB"
                />
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="d-flex flex-column" style="gap: 8px; height: 100%">
              <!-- PO Bahan vs BPB -->
              <div class="manksi-panel content-panel">
                <div class="panel-header panel-header--teal">
                  <IconTruckDelivery
                    :size="14"
                    :stroke-width="1.7"
                    class="mr-1"
                  />
                  PO Bahan vs BPB
                  <span class="panel-header-sub ml-1">(bulan ini)</span>
                  <button
                    class="po-bpb-link ml-auto"
                    @click="
                      router.push('/laporan/gudang-garmen/po-bahan-vs-bpb')
                    "
                  >
                    Lihat Detail →
                  </button>
                </div>
                <div class="panel-body">
                  <DashState v-if="isLoadingDashboard" kind="loading" />
                  <template v-else>
                    <div class="po-bpb-summary">
                      <div class="po-bpb-stat">
                        <span class="po-bpb-val text-primary">{{
                          poBpbSummary.TotalPO
                        }}</span>
                        <span class="po-bpb-lbl">Total PO</span>
                      </div>
                      <div class="po-bpb-divider" />
                      <div
                        class="po-bpb-stat clickable"
                        @click="
                          router.push('/laporan/gudang-garmen/po-bahan-vs-bpb')
                        "
                      >
                        <span
                          class="po-bpb-val"
                          style="color: var(--dsh-bad)"
                          >{{ poBpbSummary.Open }}</span
                        >
                        <span class="po-bpb-lbl">OPEN</span>
                      </div>
                      <div class="po-bpb-divider" />
                      <div class="po-bpb-stat">
                        <span
                          class="po-bpb-val"
                          style="color: var(--dsh-accent)"
                          >{{ poBpbSummary.OnProses }}</span
                        >
                        <span class="po-bpb-lbl">ON PROSES</span>
                      </div>
                      <div class="po-bpb-divider" />
                      <div class="po-bpb-stat">
                        <span class="po-bpb-val text-success">{{
                          poBpbSummary.Close
                        }}</span>
                        <span class="po-bpb-lbl">CLOSE</span>
                      </div>
                    </div>
                    <div class="po-bpb-bar-wrap" style="padding: 0 16px 12px">
                      <div class="po-bpb-bar">
                        <div
                          class="po-bpb-seg seg-open"
                          :style="{
                            width: poBpbSummary.TotalPO
                              ? (poBpbSummary.Open / poBpbSummary.TotalPO) *
                                  100 +
                                '%'
                              : '0%',
                          }"
                          :title="`OPEN: ${poBpbSummary.Open}`"
                        />
                        <div
                          class="po-bpb-seg seg-onproses"
                          :style="{
                            width: poBpbSummary.TotalPO
                              ? (poBpbSummary.OnProses / poBpbSummary.TotalPO) *
                                  100 +
                                '%'
                              : '0%',
                          }"
                          :title="`ON PROSES: ${poBpbSummary.OnProses}`"
                        />
                        <div
                          class="po-bpb-seg seg-close"
                          :style="{
                            width: poBpbSummary.TotalPO
                              ? (poBpbSummary.Close / poBpbSummary.TotalPO) *
                                  100 +
                                '%'
                              : '0%',
                          }"
                          :title="`CLOSE: ${poBpbSummary.Close}`"
                        />
                      </div>
                      <div class="po-bpb-legend">
                        <span
                          class="leg-dot"
                          style="background: var(--dsh-bad)"
                        />OPEN
                        <span
                          class="leg-dot ml-2"
                          style="background: var(--dsh-accent)"
                        />ON PROSES
                        <span
                          class="leg-dot ml-2"
                          style="background: var(--dsh-good)"
                        />CLOSE
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- PO Jasa vs BPB Jasa -->
              <div class="manksi-panel content-panel">
                <div class="panel-header panel-header--teal">
                  <IconFileInvoice
                    :size="14"
                    :stroke-width="1.7"
                    class="mr-1"
                  />
                  PO Jasa vs BPB Jasa
                  <span class="panel-header-sub ml-1">(bulan ini)</span>
                </div>
                <div class="panel-body">
                  <DashState v-if="isLoadingDashboard" kind="loading" />
                  <template v-else>
                    <div class="po-bpb-summary">
                      <div class="po-bpb-stat">
                        <span class="po-bpb-val text-primary">{{
                          poJasaVsBpjData.TotalPO
                        }}</span>
                        <span class="po-bpb-lbl">Total PO</span>
                      </div>
                      <div class="po-bpb-divider" />
                      <div class="po-bpb-stat">
                        <span
                          class="po-bpb-val"
                          style="color: var(--dsh-bad)"
                          >{{ poJasaVsBpjData.Belum }}</span
                        >
                        <span class="po-bpb-lbl">BELUM</span>
                      </div>
                      <div class="po-bpb-divider" />
                      <div class="po-bpb-stat">
                        <span
                          class="po-bpb-val"
                          style="color: var(--dsh-accent)"
                          >{{ poJasaVsBpjData.Proses }}</span
                        >
                        <span class="po-bpb-lbl">PROSES</span>
                      </div>
                      <div class="po-bpb-divider" />
                      <div class="po-bpb-stat">
                        <span class="po-bpb-val text-success">{{
                          poJasaVsBpjData.Closed
                        }}</span>
                        <span class="po-bpb-lbl">CLOSED</span>
                      </div>
                    </div>
                    <div class="po-bpb-bar-wrap" style="padding: 0 16px 12px">
                      <div class="po-bpb-bar">
                        <div
                          class="po-bpb-seg seg-open"
                          :style="{
                            width: poJasaVsBpjData.TotalPO
                              ? (poJasaVsBpjData.Belum /
                                  poJasaVsBpjData.TotalPO) *
                                  100 +
                                '%'
                              : '0%',
                          }"
                        />
                        <div
                          class="po-bpb-seg seg-onproses"
                          :style="{
                            width: poJasaVsBpjData.TotalPO
                              ? (poJasaVsBpjData.Proses /
                                  poJasaVsBpjData.TotalPO) *
                                  100 +
                                '%'
                              : '0%',
                          }"
                        />
                        <div
                          class="po-bpb-seg seg-close"
                          :style="{
                            width: poJasaVsBpjData.TotalPO
                              ? (poJasaVsBpjData.Closed /
                                  poJasaVsBpjData.TotalPO) *
                                  100 +
                                '%'
                              : '0%',
                          }"
                        />
                      </div>
                      <div class="po-bpb-legend">
                        <span
                          class="leg-dot"
                          style="background: var(--dsh-bad)"
                        />BELUM
                        <span
                          class="leg-dot ml-2"
                          style="background: var(--dsh-accent)"
                        />PROSES
                        <span
                          class="leg-dot ml-2"
                          style="background: var(--dsh-good)"
                        />CLOSED
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mt-2">
          <!-- SPK Belum STBJ -->
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--warning">
                <IconFileAlert :size="14" :stroke-width="1.7" class="mr-1" />
                SPK Belum STBJ
                <span
                  v-if="spkVsStbjSummary.RataRataHari"
                  class="ml-auto pct-badge pct-mid"
                >
                  Rata-rata {{ spkVsStbjSummary.RataRataHari }} hari
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-primary">{{
                        spkVsStbjSummary.TotalAktif
                      }}</span>
                      <span class="pen-stat-lbl">Total Aktif</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-success">{{
                        spkVsStbjSummary.SudahStbj
                      }}</span>
                      <span class="pen-stat-lbl">Sudah STBJ</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-error">{{
                        spkVsStbjSummary.BelumStbj
                      }}</span>
                      <span class="pen-stat-lbl">Belum STBJ</span>
                    </div>
                  </div>
                  <div
                    v-if="spkBelumStbjList.length || isLoadingMoreSpkStbj"
                    class="pen-list"
                    style="max-height: 320px"
                  >
                    <div
                      v-for="s in spkBelumStbjList"
                      :key="s.Nomor"
                      class="pen-item"
                      :class="
                        s.SisaHari < 0
                          ? 'umur-danger'
                          : s.SisaHari <= 3
                            ? 'umur-warn'
                            : ''
                      "
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ s.Nomor }}</span>
                        <span
                          class="pen-age"
                          :class="
                            s.SisaHari < 0
                              ? 'umur-danger'
                              : s.SisaHari <= 3
                                ? 'umur-warn'
                                : 'umur-ok'
                          "
                        >
                          {{ s.SisaHari < 0 ? "Lewat" : s.SisaHari + "h" }}
                        </span>
                      </div>
                      <div class="pen-cus">{{ s.Nama }}</div>
                      <div class="pen-ket">Dateline: {{ s.Dateline }}</div>
                    </div>
                    <div ref="spkStbjSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreSpkStbj" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!spkStbjHasMore && spkBelumStbjList.length"
                        class="pen-end"
                      >
                        {{ spkBelumStbjList.length }} SPK ditampilkan
                      </span>
                    </div>
                  </div>
                  <DashState
                    v-else
                    kind="empty"
                    message="Semua SPK bulan ini sudah ada STBJ"
                  />
                </template>
              </div>
            </div>
          </v-col>

          <!-- Status Pengiriman SPK -->
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--teal">
                <IconTruckDelivery
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Status Pengiriman SPK
                <span class="ml-auto" style="font-size: 11px">
                  {{ spkKirimRate }}% terkirim
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else>
                  <div
                    class="aging-wrap"
                    style="grid-template-columns: repeat(3, 1fr)"
                  >
                    <div
                      class="aging-chip"
                      style="
                        background: var(--dsh-bad-soft);
                        color: var(--dsh-bad);
                      "
                    >
                      <span class="aging-count">{{
                        spkVsSjSummary.BelumKirim
                      }}</span>
                      <span class="aging-label">Belum Kirim</span>
                    </div>
                    <div
                      class="aging-chip"
                      style="
                        background: var(--dsh-warn-soft);
                        color: var(--dsh-warn);
                      "
                    >
                      <span class="aging-count">{{
                        spkVsSjSummary.SebagianKirim
                      }}</span>
                      <span class="aging-label">Sebagian</span>
                    </div>
                    <div
                      class="aging-chip"
                      style="
                        background: var(--dsh-good-soft);
                        color: var(--dsh-good);
                      "
                    >
                      <span class="aging-count">{{
                        spkVsSjSummary.LunasKirim
                      }}</span>
                      <span class="aging-label">Lunas Kirim</span>
                    </div>
                  </div>

                  <div
                    style="
                      padding: 8px 12px;
                      border-bottom: 1px solid var(--dsh-fill);
                    "
                  >
                    <div class="d-flex justify-space-between mb-1">
                      <span style="font-size: 10px; color: var(--dsh-ink-3)"
                        >Total qty terkirim</span
                      >
                      <span
                        style="
                          font-size: 10px;
                          font-weight: 700;
                          color: var(--dsh-accent);
                        "
                      >
                        {{ fmtNum(spkVsSjSummary.TotalQtyKirim) }} /
                        {{ fmtNum(spkVsSjSummary.TotalQtyOrder) }}
                      </span>
                    </div>
                    <div class="cr-bar">
                      <div
                        class="cr-fill"
                        :style="{
                          width: spkVsSjSummary.TotalQtyOrder
                            ? Math.min(
                                100,
                                (spkVsSjSummary.TotalQtyKirim /
                                  spkVsSjSummary.TotalQtyOrder) *
                                  100,
                              ) + '%'
                            : '0%',
                          background: 'var(--dsh-good)',
                        }"
                      />
                    </div>
                  </div>

                  <div
                    style="
                      border-top: 1px solid var(--dsh-fill);
                      padding: 5px 12px 0;
                      font-size: 10px;
                      color: var(--dsh-ink-3);
                      font-weight: 600;
                    "
                  >
                    SPK BELUM / SEBAGIAN KIRIM
                  </div>

                  <div class="pen-list" style="max-height: 240px">
                    <div
                      v-for="s in spkBelumKirimList"
                      :key="s.Nomor"
                      class="pen-item"
                      :class="s.QtyKirim === 0 ? 'umur-danger' : 'umur-warn'"
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ s.Nomor }}</span>
                        <span
                          :style="{
                            fontSize: '10px',
                            fontWeight: '700',
                            color:
                              s.QtyKirim === 0
                                ? 'var(--dsh-bad)'
                                : 'var(--dsh-warn)',
                          }"
                        >
                          {{ fmtNum(s.QtyKirim) }}/{{ fmtNum(s.QtyOrder) }} pcs
                        </span>
                      </div>
                      <div class="pen-cus">{{ s.NamaCustomer }}</div>
                      <div class="pen-ket">DL: {{ s.Dateline }}</div>
                    </div>
                    <div ref="spkSjSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreSpkSj" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!spkSjHasMore && spkBelumKirimList.length"
                        class="pen-end"
                      >
                        {{ spkBelumKirimList.length }} SPK ditampilkan
                      </span>
                    </div>
                  </div>
                  <div
                    v-if="!spkBelumKirimList.length && !isLoadingMoreSpkSj"
                    class="text-center text-grey py-3 text-caption"
                  >
                    Semua SPK sudah lunas kirim
                  </div>
                </template>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row: Outstanding PO Mitra + Efisiensi Babaran ── -->
        <v-row dense class="mt-2">
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-accent-soft);
                  color: var(--dsh-accent);
                  border-bottom: 1px solid var(--dsh-accent-soft);
                "
              >
                <IconGauge :size="14" :stroke-width="1.7" class="mr-1" />
                Outstanding PO Mitra
                <span class="panel-header-sub ml-1">(Jasa Jahit)</span>
                <span
                  v-if="outstandingPoMitraSummary.totalMitra"
                  class="badge-count ml-auto"
                  style="background: var(--dsh-accent)"
                >
                  {{ outstandingPoMitraSummary.totalMitra }} mitra
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template
                  v-else-if="
                    outstandingPoMitraList.length || isLoadingMoreOutstanding
                  "
                >
                  <div
                    style="
                      padding: 6px 12px;
                      border-bottom: 1px solid var(--dsh-fill);
                      font-size: 11px;
                      color: var(--dsh-accent);
                      font-weight: 700;
                    "
                  >
                    Total Kurang:
                    {{ fmtNum(outstandingPoMitraSummary.totalKurang) }}
                  </div>
                  <div class="gb-list" style="max-height: 280px">
                    <div
                      v-for="m in outstandingPoMitraList"
                      :key="m.Kode"
                      class="gb-row"
                      style="cursor: pointer"
                      @click="
                        router.push(
                          '/laporan/gudang-garmen/outstanding-po-mitra',
                        )
                      "
                    >
                      <div
                        class="gb-nama"
                        :title="m.Supplier"
                        style="width: 150px"
                      >
                        {{ m.Supplier }}
                      </div>
                      <div class="gb-bar-wrap">
                        <span class="pen-cus" style="flex: 1"
                          >Target: {{ fmtNum(m.Target) }} · OTM
                          {{ fmtDec(m.Otm) }}</span
                        >
                        <span
                          style="
                            font-size: 10px;
                            font-weight: 700;
                            color: var(--dsh-accent);
                          "
                        >
                          Kurang {{ fmtNum(m.Kurang) }}
                        </span>
                      </div>
                    </div>
                    <div ref="outstandingSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreOutstanding" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="
                          !outstandingHasMore && outstandingPoMitraList.length
                        "
                        class="pen-end"
                      >
                        {{ outstandingPoMitraList.length }} mitra ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Tidak ada outstanding PO mitra jasa jahit bulan ini"
                />
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: var(--dsh-warn-soft);
                  color: var(--dsh-warn);
                  border-bottom: 1px solid var(--dsh-warn-soft);
                "
              >
                <IconScale :size="14" :stroke-width="1.7" class="mr-1" />
                Efisiensi Babaran
                <span class="panel-header-sub ml-1">(bulan ini)</span>
                <span
                  v-if="efisiensiBabaranSummary.totalSpk"
                  class="pct-badge ml-auto"
                  :class="
                    efisiensiBabaranSummary.pctDeviasi <= 10
                      ? 'pct-good'
                      : efisiensiBabaranSummary.pctDeviasi <= 30
                        ? 'pct-mid'
                        : 'pct-low'
                  "
                >
                  {{ efisiensiBabaranSummary.pctDeviasi }}% deviasi
                </span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingDashboard" kind="loading" />
                <template v-else-if="efisiensiBabaranSummary.totalSpk">
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-primary">{{
                        efisiensiBabaranSummary.totalSpk
                      }}</span>
                      <span class="pen-stat-lbl">Total SPK</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val"
                        style="color: var(--dsh-warn)"
                        >{{ efisiensiBabaranSummary.jmlDeviasi }}</span
                      >
                      <span class="pen-stat-lbl">Deviasi Minus</span>
                    </div>
                  </div>
                  <div class="gb-list" style="max-height: 220px">
                    <div
                      v-for="s in efisiensiBabaranList"
                      :key="s.Nomor"
                      class="gb-row"
                      style="cursor: pointer"
                      @click="
                        router.push(
                          '/laporan/gudang-garmen/standart-babaran-vs-realisasi',
                        )
                      "
                    >
                      <div class="gb-nama" :title="s.Nama" style="width: 150px">
                        <span class="pen-nomor">{{ s.Nomor }}</span>
                      </div>
                      <div class="gb-bar-wrap">
                        <span class="pen-cus" style="flex: 1">{{
                          s.Nama
                        }}</span>
                        <span
                          style="
                            font-size: 10px;
                            font-weight: 700;
                            color: var(--dsh-bad);
                          "
                        >
                          {{ fmtDec(s.Minus, 3) }}
                        </span>
                      </div>
                    </div>
                    <div ref="efisiensiSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreEfisiensi" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="
                          !efisiensiHasMore && efisiensiBabaranList.length
                        "
                        class="pen-end"
                      >
                        {{ efisiensiBabaranList.length }} SPK ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data babaran bulan ini."
                />
              </div>
            </div>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ════════════════════════════════════════
           TAB BARANG JADI
      ════════════════════════════════════════ -->
      <v-window-item value="barang-jadi">
        <v-row dense class="mb-3">
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Total Item Barang Jadi</div>
              <div class="sum-value text-primary">
                <span v-if="isLoadingBarangJadi">—</span>
                <span v-else>{{ fmtNum(barangJadiMetric.TotalItem) }}</span>
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Total Stok (semua gudang)</div>
              <div class="sum-value text-success">
                <span v-if="isLoadingBarangJadi">—</span>
                <span v-else>{{ fmtNum(barangJadiMetric.TotalStok) }}</span>
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Item Bergerak Bulan Ini</div>
              <div class="sum-value" style="color: var(--dsh-accent)">
                <span v-if="isLoadingBarangJadi">—</span>
                <span v-else>{{ barangJadiMetric.ItemBergerak }}</span>
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Item Stok Minus</div>
              <div class="sum-value text-error">
                <span v-if="isLoadingBarangJadi">—</span>
                <span v-else>{{ barangJadiMetric.ItemMinus }}</span>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--blue">
                <IconBoxSeam :size="14" :stroke-width="1.7" class="mr-1" />
                Stok Barang Jadi (saat ini)
                <select
                  v-model="stokBjGudangFilter"
                  class="gj-filter-sel ml-auto"
                  @change="onChangeStokBjGudang"
                >
                  <option
                    v-for="g in gudangJadiOptions"
                    :key="g.value"
                    :value="g.value"
                  >
                    {{ g.label }}
                  </option>
                </select>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingBarangJadi" kind="loading" />
                <template
                  v-else-if="stokBarangJadiList.length || isLoadingMoreStokBj"
                >
                  <div class="gb-list" style="max-height: 400px">
                    <div
                      v-for="item in stokBarangJadiList"
                      :key="item.Kode + item.Gudang"
                      class="gb-row"
                      style="
                        flex-direction: column;
                        align-items: stretch;
                        gap: 2px;
                      "
                    >
                      <div style="display: flex; align-items: center; gap: 8px">
                        <div
                          class="gb-nama"
                          style="
                            width: 160px;
                            display: flex;
                            flex-direction: column;
                            gap: 1px;
                          "
                        >
                          <span
                            style="
                              font-family: monospace;
                              font-size: 9px;
                              font-weight: 700;
                              color: var(--dsh-accent);
                            "
                            :title="item.Kode"
                          >
                            {{ item.Kode }}
                          </span>
                          <span
                            style="
                              overflow: hidden;
                              text-overflow: ellipsis;
                              white-space: nowrap;
                            "
                            :title="item.Nama"
                          >
                            {{ item.Nama }}
                          </span>
                        </div>
                        <div class="gb-bar-wrap">
                          <span class="pen-cus" style="flex: 1">
                            {{ item.Gudang }} · {{ item.Customer || "-" }}
                          </span>
                          <span
                            style="
                              font-size: 13px;
                              font-weight: 700;
                              color: var(--dsh-accent);
                              white-space: nowrap;
                            "
                          >
                            {{ fmtNum(item.Stok) }} pcs
                          </span>
                        </div>
                      </div>
                      <div
                        v-if="item.Ukuran"
                        style="
                          font-size: 9px;
                          color: var(--dsh-ink-3);
                          padding-left: 168px;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        "
                        :title="item.Ukuran"
                      >
                        {{ item.Ukuran }}
                      </div>
                    </div>
                    <div ref="stokBjSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreStokBj" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!stokBjHasMore && stokBarangJadiList.length"
                        class="pen-end"
                      >
                        {{ stokBarangJadiList.length }} item ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada data stok barang jadi."
                />
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--teal">
                <IconArrowsExchange
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Mutasi Barang Jadi
                <span class="panel-header-sub ml-1">(bulan ini)</span>
              </div>
              <div class="panel-body">
                <DashState v-if="isLoadingBarangJadi" kind="loading" />
                <template
                  v-else-if="
                    mutasiBarangJadiList.length || isLoadingMoreMutasiBj
                  "
                >
                  <div class="gb-list" style="max-height: 400px">
                    <div
                      v-for="item in mutasiBarangJadiList"
                      :key="item.Kode"
                      class="gb-row"
                      :class="{ 'row-minus': Number(item.StokAkhir) < 0 }"
                    >
                      <div
                        class="gb-nama"
                        :title="item.Nama"
                        style="width: 160px"
                      >
                        {{ item.Nama }}
                      </div>
                      <div class="gb-bar-wrap">
                        <span class="pen-cus" style="flex: 1">
                          Masuk
                          {{
                            fmtNum(
                              Number(item.Stbj) +
                                Number(item.MutasiMasuk) +
                                Number(item.Koreksi),
                            )
                          }}
                          · Keluar
                          {{
                            fmtNum(
                              Number(item.SuratJalan) +
                                Number(item.MutasiKeluar),
                            )
                          }}
                        </span>
                        <span
                          style="font-size: 10px; font-weight: 700"
                          :style="{
                            color:
                              Number(item.StokAkhir) < 0
                                ? 'var(--dsh-bad)'
                                : 'var(--dsh-accent)',
                          }"
                        >
                          Akhir {{ fmtNum(item.StokAkhir) }}
                        </span>
                      </div>
                    </div>
                    <div ref="mutasiBjSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreMutasiBj" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="
                          !mutasiBjHasMore && mutasiBarangJadiList.length
                        "
                        class="pen-end"
                      >
                        {{ mutasiBarangJadiList.length }} item ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
                <DashState
                  v-else
                  kind="empty"
                  message="Belum ada mutasi barang jadi bulan ini."
                />
              </div>
            </div>
          </v-col>
        </v-row>
      </v-window-item>

      <v-window-item value="pembelian">
        <div class="manksi-panel content-panel">
          <div class="panel-header panel-header--orange">
            <IconShoppingCart :size="14" :stroke-width="1.7" class="mr-1" />
            Outstanding Beli
            <span class="panel-header-sub ml-1"
              >(bulan berjalan · belum close &amp; belum terpenuhi penuh)</span
            >
            <button
              class="knj-detail-btn ml-auto"
              style="border-color: var(--dsh-warn-soft); color: var(--dsh-warn)"
              :disabled="isExportingOb"
              @click="exportObExcel"
            >
              <IconFileSpreadsheet
                :size="12"
                style="vertical-align: middle; margin-right: 2px"
              />
              {{ isExportingOb ? "Mengexport..." : "Export Excel" }}
            </button>
          </div>
          <v-tabs v-model="obTab" density="compact" color="primary">
            <v-tab
              v-for="t in OB_TABS"
              :key="t.value"
              :value="t.value"
              class="text-caption font-weight-bold"
            >
              {{ t.label }}
              <span
                v-if="obSummary[t.value]"
                class="badge-count ml-1"
                style="background: var(--dsh-warn)"
              >
                {{ obSummary[t.value] }}
              </span>
            </v-tab>
          </v-tabs>
          <div class="panel-body">
            <DashState v-if="isLoadingPembelian" kind="loading" />
            <div v-else style="overflow: auto; max-height: 560px">
              <table class="gb-tbl" style="min-width: 960px">
                <thead>
                  <tr>
                    <th style="width: 150px">No. Pengajuan</th>
                    <th style="width: 130px">Tgl Input</th>
                    <th style="width: 120px">Peminta</th>
                    <th>Item Barang</th>
                    <th class="tr" style="width: 90px">Qty Minta</th>
                    <th class="tr" style="width: 90px">Qty Beli</th>
                    <th class="tr" style="width: 100px">Kekurangan</th>
                    <th class="tc" style="width: 110px">Waktu Tunggu</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in obList" :key="r.Nomor + '-' + r.Nourut">
                    <td
                      style="
                        font-family: monospace;
                        font-weight: 600;
                        color: var(--dsh-accent);
                      "
                    >
                      {{ r.Nomor }}
                    </td>
                    <td style="white-space: nowrap">{{ r.TglInput }}</td>
                    <td>{{ r.Peminta || "-" }}</td>
                    <td>{{ r.Item }}</td>
                    <td class="tr">
                      {{ fmtDec(r.QtyMinta, 0) }} {{ r.Satuan }}
                    </td>
                    <td class="tr">{{ fmtDec(r.QtyBeli, 0) }}</td>
                    <td
                      class="tr"
                      style="font-weight: 700; color: var(--dsh-bad)"
                    >
                      {{ fmtDec(r.Kekurangan, 0) }}
                    </td>
                    <td class="tc">
                      <span class="pen-age" :class="umurClass(r.WaktuTunggu)"
                        >{{ r.WaktuTunggu }} hari</span
                      >
                    </td>
                  </tr>
                  <tr v-if="!obList.length && !isLoadingMoreOb">
                    <td colspan="8" class="text-center text-grey py-3">
                      Tidak ada outstanding untuk tab ini
                    </td>
                  </tr>
                </tbody>
              </table>
              <div ref="obSentinelEl" style="padding: 6px; text-align: center">
                <span v-if="isLoadingMoreOb" class="pen-loading"
                  >Memuat...</span
                >
                <span v-else-if="!obHasMore && obList.length" class="pen-end">
                  {{ obList.length }} dari {{ obTotal }} item ditampilkan
                </span>
              </div>
            </div>
          </div>
        </div>
      </v-window-item>
    </v-window>

    <!-- ════════════════════════════════════════
         DIALOG SPK URGENT (di luar v-window)
    ════════════════════════════════════════ -->
    <v-dialog
      v-model="isSpkDialogVisible"
      persistent
      max-width="1150px"
      :max-height="'90vh'"
    >
      <v-card class="spk-dialog-card" rounded="lg">
        <div class="spk-header">
          <div class="spk-header-left">
            <div class="spk-header-icon">
              <IconClipboardList :size="18" :stroke-width="1.6" color="white" />
            </div>
            <div>
              <div class="spk-header-title">SPK Akan / Sudah Dateline</div>
              <div class="spk-header-sub">
                {{ authStore.spkUrgent?.length }} SPK membutuhkan perhatian
                segera
              </div>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
            @click="closeSpkDialog"
          >
            <IconX :size="18" :stroke-width="2" />
          </v-btn>
        </div>

        <div class="spk-table-wrap">
          <table class="spk-table">
            <thead>
              <tr>
                <th class="col-spk">SPK</th>
                <th class="col-nama">Nama Pekerjaan</th>
                <th class="col-customer">Customer</th>
                <th class="col-tgl">Tanggal</th>
                <th class="col-dl">Dateline</th>
                <th class="col-num">Qty Order</th>
                <th class="col-num">Qty Jadi</th>
                <th class="col-num">Sisa</th>
                <th class="col-divisi">Divisi</th>
                <th class="col-cab">Cab</th>
                <th class="col-ws">Workshop</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in authStore.spkUrgent"
                :key="index"
                :class="{
                  'row-overdue': isOverdue(item.Dateline),
                  'row-today': isToday(item.Dateline),
                }"
              >
                <td class="col-spk">
                  <span class="spk-badge">{{ item.Spk }}</span>
                </td>
                <td class="col-nama">{{ item.Nama }}</td>
                <td class="col-customer">{{ item.Customer || "—" }}</td>
                <td class="col-tgl">{{ item.Tanggal }}</td>
                <td class="col-dl">
                  <span
                    class="dl-badge"
                    :class="{
                      overdue: isOverdue(item.Dateline),
                      today: isToday(item.Dateline),
                    }"
                  >
                    {{ item.Dateline }}
                  </span>
                </td>
                <td class="col-num">{{ item.QtyOrder }}</td>
                <td class="col-num">{{ item.QtyJadi }}</td>
                <td class="col-num">
                  <span :class="sisaClass(item)">{{ sisa(item) }}</span>
                </td>
                <td class="col-divisi">{{ item.Divisi || "—" }}</td>
                <td class="col-cab">{{ item.Cab || "—" }}</td>
                <td class="col-ws">{{ item.Workshop || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="spk-footer">
          <div class="spk-legend">
            <span class="legend-dot overdue" /><span>Sudah lewat dateline</span>
            <span class="legend-dot today" style="margin-left: 12px" /><span
              >Dateline hari ini</span
            >
          </div>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            @click="closeSpkDialog"
          >
            Mengerti, Tutup
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showEffectiveCallingDialog" max-width="1100px">
      <v-card class="rounded-lg">
        <div
          class="pa-3 d-flex align-center justify-space-between"
          style="background: var(--dsh-accent); color: white"
        >
          <span style="font-size: 13px; font-weight: 700">
            Effective Calling — {{ effectiveCallingNama }}
          </span>
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
            @click="showEffectiveCallingDialog = false"
          >
            <IconX :size="16" :stroke-width="2" />
          </v-btn>
        </div>
        <div style="max-height: 70vh; overflow-y: auto">
          <DashState v-if="isLoadingEffectiveCalling" kind="loading" />
          <table v-else class="rp-tbl" style="min-width: 900px">
            <thead>
              <tr>
                <th style="width: 140px">Customer</th>
                <th style="width: 130px">No. Penawaran</th>
                <th style="width: 70px; text-align: right">Qty</th>
                <th style="width: 100px; text-align: right">Nilai Penawaran</th>
                <th style="width: 80px; text-align: center">Status MAP</th>
                <th style="width: 100px; text-align: right">Nilai MAP</th>
                <th style="width: 80px; text-align: center">Status SO</th>
                <th style="width: 100px; text-align: right">Nilai SO</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in effectiveCallingList" :key="idx">
                <td
                  style="
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    max-width: 140px;
                  "
                  :title="row.NamaCustomer"
                >
                  {{ row.NamaCustomer }}
                </td>
                <td
                  style="
                    font-family: monospace;
                    color: var(--dsh-accent);
                    font-weight: 600;
                  "
                >
                  {{ row.NomorPenawaran }}
                </td>
                <td style="text-align: right">
                  {{ fmtNum(row.QtyPenawaran) }}
                </td>
                <td style="text-align: right">
                  {{ shortNum(row.NilaiPenawaran) }}
                </td>
                <td style="text-align: center">
                  <v-tooltip v-if="row.JmlMap > 0" location="top">
                    <template #activator="{ props }">
                      <span
                        v-bind="props"
                        class="rp-badge"
                        style="
                          background: var(--dsh-good-soft);
                          color: var(--dsh-good);
                          cursor: help;
                        "
                        >Sudah ({{ row.JmlMap }})</span
                      >
                    </template>
                    <div
                      style="
                        max-width: 260px;
                        max-height: 200px;
                        overflow-y: auto;
                      "
                    >
                      <div
                        v-for="(nomor, i) in (row.MapNomorList || '').split(
                          ', ',
                        )"
                        :key="i"
                        style="white-space: nowrap"
                      >
                        {{ nomor }}
                      </div>
                    </div>
                  </v-tooltip>
                  <span
                    v-else
                    class="rp-badge"
                    style="background: var(--dsh-fill); color: var(--dsh-ink-3)"
                    >Belum</span
                  >
                </td>
                <td style="text-align: right">
                  {{ row.NilaiMap > 0 ? shortNum(row.NilaiMap) : "-" }}
                </td>
                <td style="text-align: center">
                  <v-tooltip v-if="row.JmlSo > 0" location="top">
                    <template #activator="{ props }">
                      <span
                        v-bind="props"
                        class="rp-badge"
                        style="
                          background: var(--dsh-good-soft);
                          color: var(--dsh-good);
                          cursor: help;
                        "
                        >Sudah ({{ row.JmlSo }})</span
                      >
                    </template>
                    <div
                      style="
                        max-width: 260px;
                        max-height: 200px;
                        overflow-y: auto;
                      "
                    >
                      <div
                        v-for="(nomor, i) in (row.SoNomorList || '').split(
                          ', ',
                        )"
                        :key="i"
                        style="white-space: nowrap"
                      >
                        {{ nomor }}
                      </div>
                    </div>
                  </v-tooltip>
                  <span
                    v-else
                    class="rp-badge"
                    style="background: var(--dsh-fill); color: var(--dsh-ink-3)"
                    >Belum</span
                  >
                </td>
                <td style="text-align: right">
                  {{ row.NilaiSo > 0 ? shortNum(row.NilaiSo) : "-" }}
                </td>
              </tr>
              <tr v-if="!effectiveCallingList.length">
                <td colspan="8" class="text-center text-grey py-3 text-caption">
                  Tidak ada data penawaran 90 hari terakhir untuk sales ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showTargetDetailDialog" max-width="1200px" scrollable>
      <v-card class="rounded-lg">
        <v-card-title class="bg-primary text-white d-flex align-center pa-3">
          <span class="text-subtitle-1 font-weight-bold">
            Detail Invoice Target Collection — {{ targetDetailSalNama }}
          </span>
        </v-card-title>
        <v-card-text class="pa-3" style="max-height: 60vh">
          <div v-if="isTargetDetailLoading" class="text-center py-6 text-grey">
            Memuat data...
          </div>
          <template v-else>
            <div class="text-caption text-grey mb-2">
              Invoice terbit bulan {{ targetDetailLabel }}
              <span class="td-badge-old">LAMA</span> = invoice sebelum bulan
              tersebut (sisa per akhir bulan lalu)
            </div>
            <table class="td-detail-table" style="min-width: 780px">
              <thead>
                <tr>
                  <th style="width: 150px">No. Invoice</th>
                  <th style="width: 100px">Tanggal</th>
                  <th>Customer</th>
                  <th class="tr" style="width: 130px">Nilai Invoice</th>
                  <th class="tr" style="width: 130px">Dibayar</th>
                  <th class="tr" style="width: 130px">Sisa</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="it in targetDetailItems" :key="it.nota">
                  <td class="fw">
                    {{ it.nota }}
                    <span v-if="it.jenis === 'LAMA'" class="td-badge-old"
                      >LAMA</span
                    >
                  </td>
                  <td>{{ it.tanggal }}</td>
                  <td>{{ it.cusNama || it.cusKode }}</td>
                  <td class="tr">{{ it.debet.toLocaleString("id-ID") }}</td>
                  <td class="tr" style="color: var(--dsh-good)">
                    {{ it.terbayar.toLocaleString("id-ID") }}
                  </td>
                  <td
                    class="tr"
                    :style="{
                      color: it.sisa > 0 ? 'var(--dsh-bad)' : 'var(--dsh-good)',
                    }"
                  >
                    {{ it.sisa.toLocaleString("id-ID") }}
                  </td>
                </tr>
                <tr v-if="!targetDetailItems.length">
                  <td
                    colspan="6"
                    class="text-center text-grey py-4 font-italic"
                  >
                    Tidak ada invoice.
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="targetDetailItems.length">
                <tr>
                  <td colspan="3" class="tr fw">TOTAL</td>
                  <td class="tr fw">
                    {{ targetDetailTotal.toLocaleString("id-ID") }}
                  </td>
                  <td class="tr fw" style="color: var(--dsh-good)">
                    {{
                      targetDetailItems
                        .reduce((s, it) => s + it.terbayar, 0)
                        .toLocaleString("id-ID")
                    }}
                  </td>
                  <td class="tr fw">
                    {{ targetDetailSisaTotal.toLocaleString("id-ID") }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </template>
        </v-card-text>
        <v-card-actions class="pa-3 border-t bg-grey-lighten-4">
          <v-spacer />
          <v-btn variant="text" @click="showTargetDetailDialog = false"
            >Tutup</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="isBapAuditDialogVisible" persistent max-width="900px">
      <v-card class="spk-dialog-card" rounded="lg">
        <div class="spk-header">
          <div class="spk-header-left">
            <div class="spk-header-icon">
              <IconClipboardList :size="18" :stroke-width="1.6" color="white" />
            </div>
            <div>
              <div class="spk-header-title">
                Berita Acara / Komplain Produksi Baru
              </div>
              <div class="spk-header-sub">
                {{ authStore.bapBaruAudit?.length }} BAP belum direview
              </div>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
            @click="closeBapAuditDialog"
          >
            <IconX :size="18" :stroke-width="2" />
          </v-btn>
        </div>

        <div class="spk-table-wrap">
          <table class="spk-table">
            <thead>
              <tr>
                <th class="col-spk">Nomor</th>
                <th class="col-tgl">Tanggal</th>
                <th style="width: 130px">Tipe</th>
                <th style="width: 120px">Bagian</th>
                <th class="col-nama">Permasalahan</th>
                <th class="col-cab">Cab</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in authStore.bapBaruAudit"
                :key="index"
                style="cursor: pointer"
                @click="goToBapDetail(item.Nomor)"
              >
                <td class="col-spk">
                  <span class="spk-badge">{{ item.Nomor }}</span>
                </td>
                <td class="col-tgl">{{ item.Tanggal }}</td>
                <td>{{ item.Tipe }}</td>
                <td>{{ item.BagNama }}</td>
                <td class="col-nama">{{ item.Masalah }}</td>
                <td class="col-cab">{{ item.Cab || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="spk-footer">
          <span class="text-caption text-grey"
            >Klik baris untuk membuka & review</span
          >
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            @click="closeBapAuditDialog"
          >
            Tutup
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- ════════════════════════════════════════
         DIALOG PRA ORDER — PENDING KONFIRMASI PPIC
    ════════════════════════════════════════ -->
    <v-dialog
      v-model="isPraOrderPpicDialogVisible"
      persistent
      max-width="900px"
    >
      <v-card class="spk-dialog-card" rounded="lg">
        <div class="spk-header">
          <div class="spk-header-left">
            <div class="spk-header-icon">
              <IconClipboardList :size="18" :stroke-width="1.6" color="white" />
            </div>
            <div>
              <div class="spk-header-title">
                Pra Order Belum Ditindaklanjuti
              </div>
              <div class="spk-header-sub">
                {{ authStore.praOrderPendingPpic?.length }} Pra Order menunggu
                konfirmasi kesanggupan
              </div>
            </div>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
            @click="closePraOrderPpicDialog"
          >
            <IconX :size="18" :stroke-width="2" />
          </v-btn>
        </div>

        <div class="spk-table-wrap">
          <table class="spk-table praorder-ppic-table">
            <thead>
              <tr>
                <th class="col-spk">Nomor</th>
                <th class="col-tgl">Tanggal</th>
                <th class="col-nama">Nama Pekerjaan</th>
                <th class="col-customer">Customer</th>
                <th style="width: 100px">Divisi</th>
                <th class="col-tgl">Tgl Kirim</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, index) in authStore.praOrderPendingPpic"
                :key="index"
                style="cursor: pointer"
                @click="goToPraOrderPpicDetail"
              >
                <td class="col-spk">
                  <span class="spk-badge">{{ item.Nomor }}</span>
                </td>
                <td class="col-tgl">{{ item.Tanggal }}</td>
                <td class="col-nama">{{ item.NamaPekerjaan }}</td>
                <td class="col-customer">
                  {{
                    authStore.canLihatCus
                      ? item.Customer || "—"
                      : item.CusKode || "—"
                  }}
                </td>
                <td>{{ item.Divisi || "—" }}</td>
                <td class="col-tgl">{{ item.TglKirim }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="spk-footer">
          <span class="text-caption text-grey"
            >Klik baris untuk membuka menu Konfirmasi Pra Order</span
          >
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            @click="closePraOrderPpicDialog"
          >
            Tutup
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <v-dialog v-model="isBapReviewedDialogVisible" persistent max-width="750px">
      <v-card class="spk-dialog-card" rounded="lg">
        <div class="spk-header">
          <div class="spk-header-left">
            <div class="spk-header-icon">
              <IconClipboardList :size="18" :stroke-width="1.6" color="white" />
            </div>
            <div>
              <div class="spk-header-title">
                Catatan Review Audit — BAP Anda
              </div>
              <div class="spk-header-sub">
                {{ authStore.bapReviewedNotif?.length }} BAP sudah direview
                AUDIT
              </div>
            </div>
          </div>
        </div>

        <div class="spk-table-wrap" style="max-height: 50vh">
          <div
            v-for="item in authStore.bapReviewedNotif"
            :key="item.Nomor"
            style="
              padding: 12px 16px;
              border-bottom: 1px solid var(--dsh-line);
              cursor: pointer;
            "
            @click="goToBapDetailFromReviewed(item.Nomor)"
          >
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
              "
            >
              <span class="spk-badge">{{ item.Nomor }}</span>
              <span style="font-size: 10px; color: var(--dsh-ink-2)">{{
                item.Tanggal
              }}</span>
            </div>
            <div
              style="font-size: 11px; color: var(--dsh-ink); margin-top: 2px"
            >
              {{ item.Masalah }}
            </div>
            <div
              style="
                margin-top: 6px;
                padding: 8px 10px;
                background: var(--dsh-good-soft);
                border-left: 3px solid var(--dsh-good);
                border-radius: 3px;
                font-size: 11px;
                color: var(--dsh-ink);
                white-space: pre-wrap;
              "
            >
              {{ item.Catatan || "-" }}
            </div>
            <div
              style="
                font-size: 10px;
                color: var(--dsh-ink-3);
                margin-top: 3px;
                text-align: right;
              "
            >
              Direview oleh {{ item.ReviewedBy }} pada {{ item.ReviewedTgl }}
            </div>
          </div>
        </div>

        <div class="spk-footer">
          <label
            class="d-flex align-center"
            style="gap: 6px; cursor: pointer; font-size: 12px"
          >
            <input
              type="checkbox"
              v-model="hasReadBapReviewed"
              style="accent-color: var(--dsh-good)"
            />
            Saya sudah membaca semua catatan review di atas
          </label>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            :disabled="!hasReadBapReviewed"
            @click="closeBapReviewedDialog"
          >
            Tutup
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Dialog: Set Potensial -->
    <v-dialog v-model="showSetPotensiDialog" max-width="1000px" scrollable>
      <v-card
        class="rounded-lg"
        style="height: 80vh; display: flex; flex-direction: column"
      >
        <div
          class="pa-3 d-flex align-center justify-space-between"
          style="background: var(--dsh-warn); color: white; flex-shrink: 0"
        >
          <span style="font-size: 14px; font-weight: 700">Set Potensial</span>
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
            @click="showSetPotensiDialog = false"
          >
            <IconX :size="18" :stroke-width="2" />
          </v-btn>
        </div>

        <div
          class="pa-3"
          style="flex-shrink: 0; border-bottom: 1px solid var(--dsh-line)"
        >
          <div class="d-flex mb-2" style="gap: 8px">
            <input
              v-model="potensiSourceCustFilter"
              placeholder="Cari customer..."
              class="map-date-inp"
              style="flex: 1"
              @keyup.enter="searchPotensiSource"
            />
            <button class="map-filter-btn" @click="searchPotensiSource">
              Cari
            </button>
          </div>
          <v-tabs v-model="potensiDialogTab" density="compact" color="primary">
            <v-tab value="PENAWARAN" class="text-caption font-weight-bold"
              >Penawaran Open</v-tab
            >
            <v-tab value="MAP" class="text-caption font-weight-bold"
              >MAP Open</v-tab
            >
          </v-tabs>
        </div>

        <div style="flex: 1; overflow-y: auto; min-height: 0">
          <v-window v-model="potensiDialogTab" style="height: 100%">
            <v-window-item value="PENAWARAN" style="height: 100%">
              <div
                v-if="!penSourceList.length && isLoadingMorePenSource"
                class="text-center py-6 text-caption"
              >
                Memuat...
              </div>
              <div
                v-for="opt in penSourceList"
                :key="'PENAWARAN:' + opt.Nomor"
                class="pen-item potensi-src-row"
                :class="{ 'potensi-src-row--selected': isPotensiSelected(opt) }"
                style="cursor: pointer"
                @click="togglePotensiSelect(opt)"
              >
                <div class="d-flex align-center" style="gap: 10px">
                  <input
                    type="checkbox"
                    :checked="isPotensiSelected(opt)"
                    @click.stop="togglePotensiSelect(opt)"
                  />
                  <div style="flex: 1; min-width: 0">
                    <div class="pen-item-top">
                      <span class="pen-nomor">{{ opt.Nomor }}</span>
                      <div class="d-flex align-center" style="gap: 14px">
                        <span
                          style="
                            font-size: 10px;
                            color: var(--dsh-ink-2);
                            white-space: nowrap;
                          "
                        >
                          {{ opt.sal_nama || "-" }}
                        </span>
                        <span
                          style="
                            font-size: 11px;
                            color: var(--dsh-accent);
                            font-weight: 700;
                            white-space: nowrap;
                          "
                        >
                          {{ shortNum(opt.Nominal) }}
                        </span>
                      </div>
                    </div>
                    <div class="pen-cus">{{ opt.cus_nama }}</div>
                    <div class="pen-ket">{{ opt.NamaItem }}</div>
                  </div>
                </div>
              </div>
              <div ref="penSourceSentinelEl" class="pen-sentinel">
                <span
                  v-if="isLoadingMorePenSource && penSourceList.length"
                  class="pen-loading"
                  >Memuat...</span
                >
                <span
                  v-else-if="!penSourceHasMore && penSourceList.length"
                  class="pen-end"
                >
                  {{ penSourceList.length }} penawaran ditampilkan
                </span>
              </div>
              <div
                v-if="!isLoadingMorePenSource && !penSourceList.length"
                class="text-center py-6 text-caption text-grey"
              >
                Tidak ada Penawaran Open yang bisa ditandai.
              </div>
            </v-window-item>

            <v-window-item value="MAP" style="height: 100%">
              <div
                v-if="!mapSourceList.length && isLoadingMoreMapSource"
                class="text-center py-6 text-caption"
              >
                Memuat...
              </div>
              <div
                v-for="opt in mapSourceList"
                :key="'MAP:' + opt.Nomor"
                class="pen-item potensi-src-row"
                :class="{ 'potensi-src-row--selected': isPotensiSelected(opt) }"
                style="cursor: pointer"
                @click="togglePotensiSelect(opt)"
              >
                <div class="d-flex align-center" style="gap: 10px">
                  <input
                    type="checkbox"
                    :checked="isPotensiSelected(opt)"
                    @click.stop="togglePotensiSelect(opt)"
                  />
                  <div style="flex: 1; min-width: 0">
                    <div class="pen-item-top">
                      <span class="pen-nomor">{{ opt.Nomor }}</span>
                      <div class="d-flex align-center" style="gap: 14px">
                        <span
                          style="
                            font-size: 10px;
                            color: var(--dsh-ink-2);
                            white-space: nowrap;
                          "
                        >
                          {{ opt.sal_nama || "-" }}
                        </span>
                        <span
                          style="
                            font-size: 11px;
                            color: var(--dsh-accent);
                            font-weight: 700;
                            white-space: nowrap;
                          "
                        >
                          {{ shortNum(opt.Nominal) }}
                        </span>
                      </div>
                    </div>
                    <div class="pen-cus">{{ opt.cus_nama }}</div>
                    <div class="pen-ket">{{ opt.NamaItem }}</div>
                  </div>
                </div>
              </div>
              <div ref="mapSourceSentinelEl" class="pen-sentinel">
                <span
                  v-if="isLoadingMoreMapSource && mapSourceList.length"
                  class="pen-loading"
                  >Memuat...</span
                >
                <span
                  v-else-if="!mapSourceHasMore && mapSourceList.length"
                  class="pen-end"
                >
                  {{ mapSourceList.length }} MAP ditampilkan
                </span>
              </div>
              <div
                v-if="!isLoadingMoreMapSource && !mapSourceList.length"
                class="text-center py-6 text-caption text-grey"
              >
                Tidak ada MAP Open yang bisa ditandai.
              </div>
            </v-window-item>
          </v-window>
        </div>

        <div class="spk-footer" style="flex-shrink: 0">
          <span style="font-size: 12px; color: var(--dsh-ink-2)"
            >{{ selectedPotensiCount }} item dipilih</span
          >
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            :loading="isSubmittingPotensi"
            :disabled="selectedPotensiCount === 0"
            @click="submitSetPotensi"
          >
            Simpan ({{ selectedPotensiCount }})
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Dialog: Batal Potensi -->
    <v-dialog v-model="showBatalPotensiDialog" max-width="450px">
      <v-card class="rounded-lg pa-3">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px">
          Batalkan Potensi {{ potensiToBatal?.pot_nomor }}
        </div>
        <textarea
          v-model="batalPotensiAlasan"
          placeholder="Alasan batal (wajib)..."
          rows="3"
          style="
            width: 100%;
            border: 1px solid var(--dsh-line);
            border-radius: 4px;
            padding: 6px;
            font-size: 12px;
          "
        />
        <div class="d-flex justify-end mt-3" style="gap: 8px">
          <v-btn
            variant="text"
            size="small"
            @click="showBatalPotensiDialog = false"
            >Batal</v-btn
          >
          <v-btn
            color="error"
            variant="flat"
            size="small"
            :loading="isSubmittingBatalPotensi"
            :disabled="!batalPotensiAlasan.trim()"
            @click="submitBatalPotensi"
          >
            Konfirmasi Batal
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Dialog: Set Inkaso -->
    <v-dialog v-model="showSetInkasoDialog" max-width="760px" scrollable>
      <v-card
        class="rounded-lg"
        style="height: 85vh; display: flex; flex-direction: column"
      >
        <div
          class="pa-3 d-flex align-center justify-space-between"
          style="background: var(--dsh-accent); color: white; flex-shrink: 0"
        >
          <div>
            <span style="font-size: 14px; font-weight: 700"
              >Set Proyeksi Inkaso</span
            >
            <span
              v-if="inkasoPeriodeLabel"
              style="font-size: 11px; margin-left: 8px; opacity: 0.85"
            >
              Target Collection {{ inkasoPeriodeLabel }}
            </span>
          </div>
          <v-btn
            icon
            variant="text"
            size="small"
            color="white"
            @click="showSetInkasoDialog = false"
          >
            <IconX :size="18" :stroke-width="2" />
          </v-btn>
        </div>

        <v-tabs
          v-model="inkasoSalesTab"
          density="compact"
          color="primary"
          show-arrows
          style="flex-shrink: 0; border-bottom: 1px solid var(--dsh-line)"
        >
          <v-tab
            v-for="s in inkasoSalesList"
            :key="s.salKode"
            :value="s.salKode"
            class="text-caption font-weight-bold"
          >
            {{ s.namaSales }}
            <span
              v-if="terisiPerSales(s.salKode)"
              class="badge-count ml-1"
              style="background: var(--dsh-accent)"
            >
              {{ terisiPerSales(s.salKode) }}
            </span>
          </v-tab>
        </v-tabs>

        <div style="flex: 1; overflow: auto; min-height: 0">
          <DashState
            v-if="isLoadingInkasoSales || isLoadingInkasoRows"
            kind="loading"
          />

          <table v-if="inkasoCustomersAktif.length" class="ink-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th class="ink-num">Total Sisa</th>
                <th style="width: 180px">Tanggal Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in inkasoCustomersAktif"
                :key="c.key"
                class="ink-row"
                :class="{ 'ink-row--terisi': !!inkasoTglTarget[c.key] }"
              >
                <td class="ink-nota">{{ c.cusNama }}</td>
                <td class="ink-num ink-sisa">{{ fmtNum(c.totalSisa) }}</td>
                <td>
                  <input
                    v-model="inkasoTglTarget[c.key]"
                    type="date"
                    class="map-date-inp"
                    style="width: 100%"
                    :min="todayLocalStr()"
                  />
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>{{ inkasoCustomersAktif.length }} customer</td>
                <td class="ink-num">{{ fmtNum(inkasoTotalTab) }}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div
            v-else-if="
              !isLoadingInkasoSales &&
              !isLoadingInkasoRows &&
              inkasoSalesList.length
            "
            class="text-center py-6 text-caption text-grey"
          >
            Tidak ada invoice outstanding untuk sales ini.
          </div>
          <div
            v-else-if="!isLoadingInkasoSales && !inkasoSalesList.length"
            class="text-center py-6 text-caption text-grey"
          >
            Belum ada data Target Collection bulan ini.
          </div>
        </div>

        <div class="spk-footer" style="flex-shrink: 0; gap: 10px">
          <input
            v-model="inkasoCatatan"
            placeholder="Catatan untuk semua yang disimpan (opsional)"
            class="map-date-inp"
            style="flex: 1"
            maxlength="255"
          />
          <span
            style="
              font-size: 12px;
              color: var(--dsh-ink-2);
              white-space: nowrap;
            "
          >
            {{ inkasoCustomersTerisi.length }} customer ·
            {{ fmtNum(inkasoTotalTerisi) }}
          </span>
          <v-btn
            color="primary"
            variant="flat"
            size="small"
            :loading="isSubmittingInkaso"
            :disabled="inkasoCustomersTerisi.length === 0"
            @click="submitSetInkaso"
          >
            Simpan ({{ inkasoCustomersTerisi.length }})
          </v-btn>
        </div>
      </v-card>
    </v-dialog>

    <!-- Dialog: Batal Inkaso -->
    <v-dialog v-model="showBatalInkasoDialog" max-width="450px">
      <v-card class="rounded-lg pa-3">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 8px">
          Batalkan Proyeksi Inkaso {{ inkasoToBatal?.nota }}
        </div>
        <textarea
          v-model="batalInkasoAlasan"
          placeholder="Alasan batal (wajib)..."
          rows="3"
          style="
            width: 100%;
            border: 1px solid var(--dsh-line);
            border-radius: 4px;
            padding: 6px;
            font-size: 12px;
          "
        />
        <div class="d-flex justify-end mt-3" style="gap: 8px">
          <v-btn
            variant="text"
            size="small"
            @click="showBatalInkasoDialog = false"
            >Tutup</v-btn
          >
          <v-btn
            color="error"
            variant="flat"
            size="small"
            :loading="isSubmittingBatalInkaso"
            :disabled="!batalInkasoAlasan.trim()"
            @click="submitBatalInkaso"
          >
            Konfirmasi Batal
          </v-btn>
        </div>
      </v-card>
    </v-dialog>
  </v-container>

  <AiChatWidget v-if="canAccessAiChat" />
</template>

<style scoped>
:global(:root) {
  --dsh-canvas: #e8ecf3;
  --dsh-ink: #1b2232;
  --dsh-ink-2: #3b4358;
  --dsh-ink-3: #5b6479;
  --dsh-line: #e1e5ec;
  --dsh-fill: #f1f3f7;
  --dsh-surface: #ffffff;
  --dsh-accent: #1565c0;
  --dsh-accent-mid: #9cc0f0;
  --dsh-accent-soft: #e6f0fc;
  --dsh-good: #1f8a4c;
  --dsh-good-soft: #e6f5ec;
  --dsh-warn: #b86500;
  --dsh-warn-soft: #fdf1dc;
  --dsh-bad: #d03a34;
  --dsh-bad-soft: #fdecea;
  --dsh-radius: 12px;
  --dsh-shadow:
    0 1px 2px rgba(16, 24, 40, 0.08), 0 4px 14px rgba(16, 24, 40, 0.09);
  --dsh-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* Angka sejajar rata digit */
.gb-tbl,
.rp-tbl,
.ink-table,
.td-detail-table,
.spk-table,
.pen-stat-val,
.po-bpb-val,
.aging-count,
.aging-nominal,
.funnel-val,
.funnel-pct,
.gb-bar-val,
.gb-pct,
.saldo-kas-val,
.saldo-kas-sub-val,
.trend-val-mini,
.kk-nilai,
.rp-bulanan-total,
.knj-pct,
.real-pct {
  font-variant-numeric: tabular-nums;
}

/* ── Panel ── */
.manksi-panel {
  background: var(--dsh-surface);
  border: 1px solid var(--dsh-line);
  border-radius: var(--dsh-radius);
  box-shadow: var(--dsh-shadow);
  overflow: hidden;
}
.header-panel {
  padding: 12px 16px;
  border-left: 4px solid var(--dsh-accent);
}
.content-panel {
  display: flex;
  flex-direction: column;
}
.panel-header {
  padding: 9px 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.005em;
  background: var(--dsh-surface);
  color: var(--dsh-ink);
  border-bottom: 1px solid var(--dsh-line);
}
.panel-header svg {
  opacity: 0.85;
}
.panel-header--blue,
.panel-header--teal {
  background: var(--dsh-accent-soft);
  color: var(--dsh-accent);
  border-bottom-color: var(--dsh-accent-soft);
}
.panel-header--green {
  background: var(--dsh-good-soft);
  color: var(--dsh-good);
  border-bottom-color: var(--dsh-good-soft);
}
.panel-header--orange,
.panel-header--warning {
  background: var(--dsh-warn-soft);
  color: var(--dsh-warn);
  border-bottom-color: var(--dsh-warn-soft);
}
.panel-header-sub {
  font-size: 11px;
  font-weight: 400;
  color: var(--dsh-ink-3);
}

.badge-count {
  background: var(--dsh-warn);
  color: #fff;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 8px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
.pct-badge {
  font-size: 10.5px;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 999px;
  line-height: 1.5;
}
.pct-good {
  background: var(--dsh-good-soft);
  color: var(--dsh-good);
}
.pct-mid {
  background: var(--dsh-warn-soft);
  color: var(--dsh-warn);
}
.pct-low {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}

.panel-body {
  flex-grow: 1;
  overflow: hidden;
}

/* ── Summary Cards ── */
.sum-card {
  background: var(--dsh-surface);
  border: 1px solid var(--dsh-line);
  border-radius: var(--dsh-radius);
  box-shadow: var(--dsh-shadow);
  padding: 14px 16px;
  text-align: left;
}
.sum-label {
  font-size: 11.5px;
  font-weight: 500;
  color: var(--dsh-ink-2);
  margin-bottom: 4px;
}
.sum-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.sum-sub {
  font-size: 11.5px;
  color: var(--dsh-ink-3);
  margin-top: 4px;
}

/* ── Shortcut Cards (Overview) ── */
.shortcut-card {
  background: var(--dsh-surface);
  border: 1px solid var(--dsh-line);
  border-radius: var(--dsh-radius);
  box-shadow: var(--dsh-shadow);
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition:
    transform 0.18s var(--dsh-ease),
    border-color 0.15s,
    box-shadow 0.18s;
}
.shortcut-card:hover {
  border-color: var(--dsh-accent);
  box-shadow: 0 4px 14px rgba(21, 101, 192, 0.12);
}
.shortcut-card:active {
  transform: scale(0.985);
  transition-duration: 0.08s;
}
.shortcut-card svg:first-child {
  color: var(--dsh-accent);
}
.shortcut-card svg:last-child {
  color: var(--dsh-ink-3);
}
.shortcut-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--dsh-ink);
}
.shortcut-sub {
  font-size: 12px;
  color: var(--dsh-ink-2);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Penawaran ── */
.pen-summary-bar {
  display: flex;
  border-bottom: 1px solid var(--dsh-fill);
  padding: 6px 0;
}
.pen-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  border-right: 1px solid var(--dsh-fill);
}
.pen-stat:last-child {
  border-right: none;
}
.pen-stat-val {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}
.pen-stat-lbl {
  font-size: 10px;
  color: var(--dsh-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pen-list {
  max-height: 320px;
  overflow-y: auto;
}
.pen-item {
  padding: 5px 12px;
  border-bottom: 1px solid var(--dsh-fill);
  font-size: 12px;
}
.pen-item.umur-danger {
  background: var(--dsh-bad-soft);
}
.pen-item.umur-warn {
  background: var(--dsh-warn-soft);
}
.pen-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pen-nomor {
  font-family: monospace;
  font-weight: 700;
  color: var(--dsh-accent);
  font-size: 12px;
}
.pen-divisi {
  font-size: 11px;
  color: var(--dsh-ink-3);
}
.pen-age {
  font-size: 11px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}
.pen-age.umur-danger {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}
.pen-age.umur-warn {
  background: var(--dsh-warn-soft);
  color: var(--dsh-warn);
}
.pen-age.umur-ok {
  background: var(--dsh-good-soft);
  color: var(--dsh-good);
}
.pen-cus {
  color: var(--dsh-ink);
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
}
.pen-ket {
  font-size: 11px;
  color: var(--dsh-ink-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pen-sentinel {
  padding: 6px 12px;
  text-align: center;
}
.pen-loading {
  font-size: 10px;
  color: var(--dsh-ink-3);
  font-style: italic;
}
.pen-end {
  font-size: 10px;
  color: var(--dsh-ink-3);
}

.real-list {
  max-height: 280px;
  overflow-y: auto;
}
.real-row {
  padding: 6px 12px;
  border-bottom: 1px solid var(--dsh-fill);
}
.real-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.real-divisi {
  font-size: 11px;
  font-weight: 700;
  color: var(--dsh-accent);
}
.real-nominal {
  font-size: 10px;
  color: var(--dsh-ink-2);
}
.real-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}
.real-bar {
  flex: 1;
  height: 8px;
  background: var(--dsh-fill);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}
.real-seg {
  height: 100%;
  transition: width 0.3s;
}
.real-seg--close {
  background: var(--dsh-good);
}
.real-seg--batal {
  background: var(--dsh-bad);
}
.real-seg--open {
  background: var(--dsh-accent-mid);
}
.real-pct {
  font-size: 10px;
  font-weight: 700;
  color: var(--dsh-good);
  min-width: 28px;
  text-align: right;
}
.real-detail {
  display: flex;
  gap: 8px;
  font-size: 10px;
}
.rd-close {
  color: var(--dsh-good);
}
.rd-batal {
  color: var(--dsh-bad);
}
.rd-open {
  color: var(--dsh-accent);
}
.real-legend {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 10px;
  color: var(--dsh-ink-2);
  border-top: 1px solid var(--dsh-fill);
  background: var(--dsh-fill);
}
.leg-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 3px;
}
.leg-close {
  background: var(--dsh-good);
  margin-left: 8px;
}
.leg-batal {
  background: var(--dsh-bad);
  margin-left: 8px;
}
.leg-open {
  background: var(--dsh-accent-mid);
  margin-left: 8px;
}

/* ── MAP List ── */
.map-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  max-height: 320px;
  overflow-y: auto;
  align-content: start;
}
.map-list::after {
  content: "";
  flex: auto;
  grid-column: 1 / -1;
  height: 0;
}
.map-item {
  padding: 6px 10px;
  border-bottom: 1px solid var(--dsh-fill);
  border-right: 1px solid var(--dsh-fill);
  font-size: 11px;
  transition: background 0.1s;
}
.map-item:hover {
  background: var(--dsh-warn-soft) !important;
}
.map-item.map-danger {
  background: var(--dsh-bad-soft);
}
.map-item.map-warn {
  background: var(--dsh-warn-soft);
}
.map-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}
.map-nomor {
  font-family: monospace;
  font-weight: 700;
  color: var(--dsh-accent);
  font-size: 11px;
}
.map-cus {
  color: var(--dsh-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.map-close-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}

/* ── Kunjungan Sales ── */
.knj-wrap {
  padding: 4px 0;
  max-height: 220px;
  overflow-y: auto;
}
.knj-row {
  padding: 5px 12px;
  border-bottom: 1px solid var(--dsh-fill);
}
.knj-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.knj-sales {
  font-size: 12px;
  font-weight: 700;
  color: var(--dsh-accent);
  text-transform: uppercase;
}
.knj-stats {
  display: flex;
  align-items: center;
  gap: 5px;
}
.knj-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}
.knj-badge.done {
  background: var(--dsh-good-soft);
  color: var(--dsh-good);
}
.knj-badge.failed {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}
.knj-badge.unplan {
  background: var(--dsh-accent-soft);
  color: var(--dsh-accent);
}
.knj-total {
  font-size: 9px;
  color: var(--dsh-ink-3);
  margin-left: 2px;
}
.knj-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.knj-bar {
  flex: 1;
  height: 7px;
  background: var(--dsh-fill);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}
.knj-seg {
  height: 100%;
  transition: width 0.3s;
}
.knj-done {
  background: var(--dsh-good);
}
.knj-unplan {
  background: var(--dsh-accent-mid);
}
.knj-failed {
  background: var(--dsh-bad);
}
.knj-pct {
  font-size: 10px;
  font-weight: 700;
  color: var(--dsh-good);
  min-width: 28px;
  text-align: right;
}
.knj-nominal-badge {
  font-size: 9px;
  font-weight: 700;
  background: var(--dsh-accent-soft);
  color: var(--dsh-accent);
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
.knj-nominal-badge--mh {
  background: var(--dsh-accent-soft);
  color: var(--dsh-accent);
}
.knj-detail-btn {
  font-size: 10px;
  font-weight: 700;
  color: var(--dsh-good);
  background: none;
  border: 1px solid var(--dsh-line);
  border-radius: 3px;
  padding: 3px 8px;
  cursor: pointer;
  line-height: 1.4;
}
.knj-detail-btn:hover {
  background: var(--dsh-good-soft);
}

/* ── PO BPB ── */
.po-bpb-link {
  font-size: 10px;
  font-weight: 700;
  color: var(--dsh-accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.po-bpb-link:hover {
  text-decoration: underline;
}
.po-bpb-summary {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  flex-wrap: wrap;
}
.po-bpb-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
  gap: 2px;
}
.po-bpb-stat.clickable {
  cursor: pointer;
}
.po-bpb-stat.clickable:hover .po-bpb-val {
  text-decoration: underline;
}
.po-bpb-val {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
.po-bpb-lbl {
  font-size: 10px;
  color: var(--dsh-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.po-bpb-divider {
  width: 1px;
  height: 32px;
  background: var(--dsh-line);
  flex-shrink: 0;
}
.po-bpb-bar-wrap {
  flex: 1;
  min-width: 200px;
  padding: 0 16px;
}
.po-bpb-bar {
  height: 10px;
  background: var(--dsh-fill);
  border-radius: 5px;
  overflow: hidden;
  display: flex;
  margin-bottom: 4px;
}
.po-bpb-seg {
  height: 100%;
  transition: width 0.3s;
}
.seg-open {
  background: var(--dsh-bad);
}
.seg-onproses {
  background: var(--dsh-accent);
}
.seg-close {
  background: var(--dsh-good);
}
.po-bpb-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--dsh-ink-2);
}

/* ── Dialog SPK ── */
.spk-dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 88vh;
  overflow: hidden;
}
.spk-header {
  background: var(--dsh-ink);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.spk-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.spk-header-icon {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.spk-header-title {
  font-size: 14px;
  font-weight: 700;
  color: white;
}
.spk-header-sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 1px;
}
.spk-table-wrap {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
.spk-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.spk-table thead tr {
  background: var(--dsh-fill);
  position: sticky;
  top: 0;
  z-index: 1;
}
.spk-table th {
  padding: 8px 10px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--dsh-ink);
  border-bottom: 2px solid var(--dsh-line);
  white-space: nowrap;
  text-align: left;
}
.spk-table th.col-num {
  text-align: right;
}
.spk-table td {
  padding: 6px 10px;
  font-size: 12px;
  color: var(--dsh-ink);
  border-bottom: 1px solid var(--dsh-fill);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spk-table td.col-num {
  text-align: right;
}
.spk-table td.col-nama {
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: unset !important;
  word-break: break-word;
}
.col-spk {
  width: 130px;
}
.col-nama {
  width: auto;
}
.col-customer {
  width: 110px;
}
.col-tgl {
  width: 95px;
}
.col-dl {
  width: 100px;
}
.col-num {
  width: 80px;
}
.col-divisi {
  width: 70px;
}
.col-cab {
  width: 60px;
}
.col-ws {
  width: 110px;
}
.praorder-ppic-table .col-tgl {
  width: 130px;
}
.row-overdue td {
  background: var(--dsh-bad-soft);
}
.row-today td {
  background: var(--dsh-warn-soft);
}
.spk-table tbody tr:hover td {
  background: var(--dsh-accent-soft) !important;
}
.spk-badge {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  color: var(--dsh-accent);
}
.dl-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: var(--dsh-fill);
  color: var(--dsh-ink);
}
.dl-badge.overdue {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}
.dl-badge.today {
  background: var(--dsh-warn-soft);
  color: var(--dsh-warn);
}
.spk-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--dsh-fill);
  border-top: 1px solid var(--dsh-line);
  flex-shrink: 0;
}
.spk-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--dsh-ink-2);
}
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.legend-dot.overdue {
  background: var(--dsh-bad-soft);
}
.legend-dot.today {
  background: var(--dsh-warn-soft);
}
.val-danger {
  color: var(--dsh-bad);
  font-weight: 700;
}
.val-done {
  color: var(--dsh-good);
}
.val-warn {
  color: var(--dsh-warn);
  font-weight: 600;
}

/* ── Utility ── */
.ml-2 {
  margin-left: 8px;
}
.fill-height {
  height: 100%;
}

.overdue-list {
  max-height: 380px;
  overflow-y: auto;
}
.overdue-item {
  padding: 7px 12px;
  border-bottom: 1px solid var(--dsh-fill);
  font-size: 11px;
  background: var(--dsh-bad-soft);
}
.overdue-item:hover {
  background: var(--dsh-bad-soft);
}

/* ── Collection Rate ── */
.cr-bar-wrap {
  margin-top: 5px;
}
.cr-bar {
  height: 5px;
  background: var(--dsh-fill);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 3px;
}
.cr-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}
.cr-sub {
  font-size: 10px;
  color: var(--dsh-ink-3);
}

/* ── Aging Bucket ── */
.aging-wrap {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--dsh-fill);
  border-bottom: 1px solid var(--dsh-fill);
}
.aging-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 7px 4px;
  gap: 1px;
  cursor: default;
  transition: opacity 0.15s;
}
.aging-chip:hover {
  opacity: 0.85;
}
.aging-count {
  font-size: 18px;
  font-weight: 700;
  line-height: 1;
}
.aging-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.aging-nominal {
  font-size: 10px;
  margin-top: 1px;
}

.aging-chip--a {
  background: var(--dsh-warn-soft);
  color: var(--dsh-warn);
}
.aging-chip--a .aging-nominal {
  color: var(--dsh-warn);
}

.aging-chip--b {
  background: var(--dsh-warn-soft);
  color: var(--dsh-warn);
}
.aging-chip--b .aging-nominal {
  color: var(--dsh-warn);
}

.aging-chip--c {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}
.aging-chip--c .aging-nominal {
  color: var(--dsh-bad);
}

.aging-chip--d {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}
.aging-chip--d .aging-count {
  font-size: 20px;
}
.aging-chip--d .aging-nominal {
  color: var(--dsh-bad);
  font-weight: 700;
}

/* ── Overdue List ── */
.overdue-list {
  max-height: 320px;
  overflow-y: auto;
}
.overdue-item {
  padding: 7px 12px;
  border-bottom: 1px solid var(--dsh-fill);
  font-size: 11px;
  border-left: 3px solid transparent;
  transition: background 0.1s;
}
.overdue-item:hover {
  background: var(--dsh-bad-soft);
}
.overdue-low {
  border-left-color: var(--dsh-warn);
  background: var(--dsh-warn-soft);
}
.overdue-mid {
  border-left-color: var(--dsh-warn);
  background: var(--dsh-warn-soft);
}
.overdue-high {
  border-left-color: var(--dsh-bad);
  background: var(--dsh-bad-soft);
}
.overdue-critical {
  border-left-color: var(--dsh-bad);
  background: var(--dsh-bad-soft);
}

/* ── Trend Cashflow ── */
.trend-lbl-mini {
  font-size: 9px;
  font-weight: 700;
  width: 45px;
  text-transform: uppercase;
}
.trend-val-mini {
  font-size: 10px;
  font-weight: 700;
  width: 45px;
  text-align: right;
  color: var(--dsh-ink-2);
}
.trend-bar-bg {
  flex: 1;
  height: 6px;
  background: var(--dsh-fill);
  border-radius: 3px;
  overflow: hidden;
}
.trend-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}

/* ── Gudang Bahan ── */
.gb-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 0;
}
.gb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-bottom: 1px solid var(--dsh-fill);
}
.gb-row:last-child {
  border-bottom: none;
}
.gb-nama {
  width: 130px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--dsh-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gb-bar-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.gb-bar-track {
  flex: 1;
  height: 10px;
  background: var(--dsh-fill);
  border-radius: 3px;
  overflow: hidden;
}
.gb-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.gb-bar-val {
  font-size: 11px;
  color: var(--dsh-ink-2);
  white-space: nowrap;
  min-width: 80px;
  text-align: right;
}
.gb-pct {
  font-size: 10px;
  font-weight: 700;
  min-width: 32px;
  text-align: right;
  flex-shrink: 0;
}
.gb-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 500px;
}
.gb-tbl thead th {
  background: var(--dsh-accent-soft);
  color: var(--dsh-accent);
  font-weight: 600;
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid var(--dsh-accent-soft);
  white-space: nowrap;
}
.gb-tbl tbody td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--dsh-fill);
}
.gb-tbl tbody tr:last-child td {
  border-bottom: none;
}
.gb-tbl tbody tr:hover td {
  background: var(--dsh-fill);
}
.gb-tbl .tr {
  text-align: right;
}
.gb-tbl .tc {
  text-align: center;
}
.gb-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}
.gb-badge--ok {
  background: var(--dsh-good-soft);
  color: var(--dsh-good);
}
.gb-badge--warn {
  background: var(--dsh-warn-soft);
  color: var(--dsh-warn);
}
.gb-badge--danger {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}

/* ── Realisasi Penawaran ── */
.rp-summary {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--dsh-fill);
  flex-wrap: wrap;
  gap: 0;
}
.rp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 14px;
  gap: 2px;
}
.rp-divider {
  width: 1px;
  height: 28px;
  background: var(--dsh-line);
  flex-shrink: 0;
}
.rp-val {
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}
.rp-pct {
  font-size: 10px;
  font-weight: 400;
  color: var(--dsh-ink-3);
  margin-left: 2px;
}
.rp-lbl {
  font-size: 9px;
  color: var(--dsh-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.rp-stack-wrap {
  padding: 10px 12px 6px;
  border-bottom: 1px solid var(--dsh-fill);
}
.rp-stack {
  display: flex;
  height: 22px;
  border-radius: 3px;
  overflow: hidden;
  width: 100%;
}
.rp-seg {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: white;
  transition: width 0.4s;
  min-width: 0;
  overflow: hidden;
}
.rp-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 5px 0 2px;
  font-size: 10px;
  color: var(--dsh-ink-2);
}
.rp-tren-wrap {
  padding: 8px 12px;
}
.rp-tren-title {
  font-size: 10px;
  font-weight: 600;
  color: var(--dsh-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.rp-tren-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.rp-tren-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rp-tren-bulan {
  font-size: 10px;
  color: var(--dsh-ink-2);
  width: 55px;
  flex-shrink: 0;
  font-weight: 500;
}
.rp-tren-bar-wrap {
  flex: 1;
}
.rp-tren-track {
  height: 10px;
  background: var(--dsh-fill);
  border-radius: 3px;
  overflow: visible;
  position: relative;
}
.rp-tren-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s;
}
.rp-target-line {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 1px;
  background: var(--dsh-ink-3);
  border-left: 2px dashed var(--dsh-ink-3);
}
.rp-tren-val {
  font-size: 10px;
  font-weight: 700;
  width: 38px;
  text-align: right;
  flex-shrink: 0;
}
.rp-tren-konversi {
  font-size: 10px;
  color: var(--dsh-ink-3);
  width: 38px;
  text-align: right;
  flex-shrink: 0;
}

/* ── Tabel realisasi detail ── */
.rp-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  min-width: 700px;
}
.gb-tbl thead th,
.rp-tbl thead th {
  background: var(--dsh-fill);
  color: var(--dsh-ink-2);
  font-weight: 600;
  padding: 7px 10px;
  text-align: left;
  border-bottom: 1px solid var(--dsh-line);
  white-space: nowrap;
}
.rp-tbl tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid var(--dsh-fill);
  color: var(--color-text-primary, var(--dsh-ink));
}
.rp-tbl tbody tr:last-child td {
  border-bottom: none;
}
.rp-tbl tbody tr:hover td {
  background: var(--dsh-fill);
}
.rp-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}
.rp-badge--fast {
  background: var(--dsh-good-soft);
  color: var(--dsh-good);
}
.rp-badge--mid {
  background: var(--dsh-accent-soft);
  color: var(--dsh-accent);
}
.rp-badge--slow {
  background: var(--dsh-warn-soft);
  color: var(--dsh-warn);
}
.rp-badge--vslow {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}
.rp-badge--none {
  background: var(--dsh-fill);
  color: var(--dsh-ink-2);
}

.map-date-inp {
  border: 1px solid var(--dsh-line);
  border-radius: 4px;
  padding: 3px 7px;
  font-size: 11px;
  color: var(--dsh-ink);
  background: white;
  outline: none;
}
.map-date-inp:focus {
  border-color: var(--dsh-accent);
}
.map-filter-btn {
  background: var(--dsh-accent);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.map-filter-btn:hover {
  background: var(--dsh-accent);
}

.gyy-list {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  max-height: none;
  overflow-y: auto;
}
.gyy-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--dsh-fill);
  font-size: 11px;
}
.gyy-row:last-child {
  border-bottom: none;
}
.gyy-col-bulan {
  width: 55px;
  flex-shrink: 0;
  color: var(--dsh-accent);
  font-weight: 600;
}
.gyy-col-aktual {
  flex: 1;
  min-width: 0;
  color: var(--dsh-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gyy-col-yoy {
  width: 55px;
  flex-shrink: 0;
  text-align: right;
  font-weight: 700;
}
.gyy-col-ach {
  width: 65px;
  flex-shrink: 0;
  text-align: right;
}
.gyy-col-target {
  width: 110px;
  flex-shrink: 0;
  text-align: right;
  color: var(--dsh-ink-2);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.gyy-ach-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 8px;
  white-space: nowrap;
}
.gyy-ach-badge--none {
  background: var(--dsh-fill);
  color: var(--dsh-ink-3);
}
.gyy-list-fill {
  max-height: none;
  flex: 1;
  overflow-y: auto;
}
.content-panel .panel-body {
  display: flex;
  flex-direction: column;
}

/* ── Aktivitas list ── */
.aktivitas-list {
  display: flex;
  flex-direction: column;
}
.aktivitas-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--dsh-fill);
  font-size: 12px;
}
.aktivitas-item:hover {
  background: var(--dsh-fill);
}
.jenis-badge {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  width: 72px;
  text-align: center;
}
.akt-nomor {
  font-family: monospace;
  font-weight: 600;
  color: var(--dsh-accent);
  width: 160px;
  flex-shrink: 0;
}
.akt-nama {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsh-ink);
}
.akt-divisi {
  width: 100px;
  flex-shrink: 0;
  color: var(--dsh-ink-2);
  font-size: 11px;
}
.akt-jam {
  flex-shrink: 0;
  color: var(--dsh-ink-3);
  font-size: 11px;
  font-family: monospace;
}

.empty-hint {
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: var(--dsh-ink-3);
}

.aktivitas-item--new {
  background: var(--dsh-good-soft) !important;
  animation: highlight-fade 3s ease-out forwards;
}

.bk-row {
  border-bottom: 1px solid var(--dsh-fill);
}
.bk-bahan-list {
  padding: 2px 12px 6px 34px;
}
.bk-bahan-item {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--dsh-ink-2);
  padding: 1px 0;
}
.bk-bahan-nama {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}
.bk-bahan-kurang {
  color: var(--dsh-bad);
  font-weight: 600;
  white-space: nowrap;
}
.row-minus {
  background: var(--dsh-bad-soft);
}
.gj-filter-sel {
  font-size: 10px;
  border: 1px solid var(--dsh-accent-soft);
  border-radius: 3px;
  padding: 2px 6px;
  background: white;
  color: var(--dsh-accent);
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

.rp-bulanan-list {
  max-height: 400px;
  overflow-y: auto;
}
.rp-bulanan-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px;
  border-bottom: 1px solid var(--dsh-fill);
}
.rp-bulanan-row:last-child {
  border-bottom: none;
}
.rp-bulanan-bulan {
  width: 48px;
  flex-shrink: 0;
  font-size: 10px;
  color: var(--dsh-ink-2);
  font-weight: 600;
}
.rp-bulanan-bar-wrap {
  flex: 1;
  min-width: 0;
}
.rp-bulanan-bar {
  display: flex;
  height: 14px;
  border-radius: 3px;
  overflow: visible;
  background: var(--dsh-fill);
}
.rp-bulanan-seg {
  position: relative;
  height: 100%;
  transition: width 0.3s;
}
.rp-seg--open {
  background: var(--dsh-accent-mid);
}
.rp-seg--close {
  background: var(--dsh-good);
}
.rp-seg--batal {
  background: var(--dsh-bad);
}
.rp-tooltip {
  display: none;
  position: absolute;
  bottom: 120%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--dsh-ink);
  color: #fff;
  font-size: 10px;
  padding: 4px 8px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 10;
}
.rp-tooltip--below {
  bottom: auto;
  top: 120%;
}
.rp-tooltip-title {
  font-weight: 700;
  margin-bottom: 2px;
}
.rp-total-row td {
  background: var(--dsh-fill);
  border-top: 2px solid var(--dsh-line);
  position: sticky;
  bottom: 0;
  z-index: 1;
}
.rp-total-card {
  border: 2px solid var(--dsh-good);
}
.rp-bulanan-seg:hover .rp-tooltip {
  display: block;
}
.rp-bulanan-total {
  width: 55px;
  flex-shrink: 0;
  text-align: right;
  font-size: 10px;
  font-weight: 700;
  color: var(--dsh-ink);
}
.kk-stack {
  display: flex;
  height: 22px;
  margin: 10px 12px 8px;
  border-radius: 3px;
  overflow: hidden;
}
.kk-seg {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: white;
  transition: width 0.4s;
}
.kk-list {
  padding: 0 12px 10px;
}
.kk-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 11px;
}
.kk-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.kk-label {
  width: 100px;
  flex-shrink: 0;
  color: var(--dsh-ink);
}
.kk-item {
  flex: 1;
  color: var(--dsh-ink-2);
}
.kk-nilai {
  font-weight: 700;
  color: var(--dsh-ink);
  white-space: nowrap;
}

.tc-month-strip {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--dsh-fill);
  overflow-x: auto;
  background: var(--dsh-fill);
}
.tc-month-chip {
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid var(--dsh-line);
  background: white;
  color: var(--dsh-ink-2);
  cursor: pointer;
  transition: all 0.15s;
}
.tc-month-chip:hover {
  border-color: var(--dsh-good);
  color: var(--dsh-good);
}
.tc-month-chip--active {
  background: var(--dsh-good);
  border-color: var(--dsh-good);
  color: white;
}

.potensi-src-row--selected {
  background: var(--dsh-warn-soft);
}

.ink-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.ink-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--dsh-fill);
  color: var(--dsh-ink-2);
  font-weight: 600;
  font-size: 11px;
  text-align: left;
  padding: 7px 8px;
  white-space: nowrap;
  border-bottom: 1px solid var(--dsh-line);
}
.ink-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--dsh-fill);
  vertical-align: middle;
}
.ink-table tfoot td {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: var(--dsh-fill);
  color: var(--dsh-ink);
  font-weight: 600;
  padding: 7px 8px;
  border-top: 1px solid var(--dsh-line);
  border-bottom: none;
}
.ink-num {
  text-align: right;
  white-space: nowrap;
}
.ink-row:hover {
  background: var(--dsh-fill);
}
.ink-row--terisi {
  background: var(--dsh-good-soft);
}
.ink-nota {
  font-weight: 700;
  white-space: nowrap;
}
.ink-sisa {
  color: var(--dsh-bad);
  font-weight: 700;
}
.td-sales-link {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  color: inherit;
}
.td-sales-link:hover {
  color: var(--dsh-accent);
}
.td-detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.td-detail-table th {
  background: var(--dsh-fill);
  padding: 6px 8px;
  text-align: left;
  border-bottom: 2px solid var(--dsh-ink-3);
}
.td-detail-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--dsh-fill);
}
.td-detail-table .tr {
  text-align: right;
}
.td-detail-table .fw {
  font-weight: 700;
}
.td-detail-table th,
.td-detail-table td {
  white-space: nowrap;
}
.td-badge-old {
  display: inline-block;
  background: var(--dsh-warn);
  color: white;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: 4px;
  vertical-align: middle;
}

@keyframes highlight-fade {
  0% {
    background: var(--dsh-good-soft);
  }
  100% {
    background: transparent;
  }
}

.saldo-kas-card {
  position: relative;
  border-radius: var(--dsh-radius);
  padding: 16px 22px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--dsh-line);
  box-shadow: var(--dsh-shadow);
}
.saldo-kas-card--pos {
  background: var(--dsh-good-soft);
  border-color: rgba(31, 138, 76, 0.2);
}
.saldo-kas-card--neg {
  background: var(--dsh-bad-soft);
  border-color: rgba(208, 58, 52, 0.22);
}
.saldo-kas-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.saldo-kas-card--pos .saldo-kas-icon-wrap {
  background: var(--dsh-good-soft);
  color: var(--dsh-good);
}
.saldo-kas-card--neg .saldo-kas-icon-wrap {
  background: var(--dsh-bad-soft);
  color: var(--dsh-bad);
}
.saldo-kas-main {
  flex: 1;
  min-width: 0;
}
.saldo-kas-val {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.saldo-kas-card--pos .saldo-kas-val {
  color: var(--dsh-good);
}
.saldo-kas-card--neg .saldo-kas-val {
  color: var(--dsh-bad);
}
.saldo-kas-lbl {
  font-size: 10px;
  color: var(--dsh-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 2px;
}
.saldo-kas-divider {
  width: 1px;
  height: 36px;
  background: var(--dsh-line);
  flex-shrink: 0;
}
.saldo-kas-sub {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 12px;
  flex-shrink: 0;
}
.saldo-kas-sub-val {
  font-size: 18px;
  font-weight: 700;
  color: var(--dsh-ink-2);
}
.saldo-kas-sub-lbl {
  font-size: 9px;
  color: var(--dsh-ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ── Canvas, tipografi sistem, dan warna utilitas khusus dashboard ── */
.dsh-root {
  background: var(--dsh-canvas);
  min-height: 100%;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  font-weight: 500;
  color: var(--dsh-ink);
}
.dsh-root .text-primary {
  color: var(--dsh-accent) !important;
}
.dsh-root .text-success {
  color: var(--dsh-good) !important;
}
.dsh-root .text-warning {
  color: var(--dsh-warn) !important;
}
.dsh-root .text-error {
  color: var(--dsh-bad) !important;
}
.dsh-root .bg-primary {
  background: var(--dsh-accent) !important;
}
.dsh-root .bg-success {
  background: var(--dsh-good) !important;
}

/* Lingkaran ikon Saldo Kas: putih di atas kartu bertinta */
.saldo-kas-card--pos .saldo-kas-icon-wrap,
.saldo-kas-card--neg .saldo-kas-icon-wrap {
  background: var(--dsh-surface);
}

/* Tekan terasa instan */
.tc-month-chip:active,
.knj-detail-btn:active,
.map-filter-btn:active {
  transform: scale(0.96);
}

/* ── Label pembaruan dan banner kegagalan ── */
.dsh-updated {
  font-size: 11px;
  color: var(--dsh-ink-3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.dsh-updated--busy {
  color: var(--dsh-accent);
}
.dsh-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--dsh-warn);
  background: var(--dsh-warn-soft);
  border: 1px solid rgba(184, 101, 0, 0.25);
  border-radius: var(--dsh-radius);
}
.dsh-banner-text {
  flex: 1;
  min-width: 0;
  color: var(--dsh-ink);
}
.dsh-banner-text strong {
  font-weight: 600;
  color: var(--dsh-warn);
}
.dsh-banner-btn {
  flex-shrink: 0;
  min-height: 30px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--dsh-warn);
  background: var(--dsh-surface);
  border: 1px solid rgba(184, 101, 0, 0.35);
  border-radius: 6px;
  cursor: pointer;
}
.dsh-banner-btn:focus-visible {
  outline: 2px solid var(--dsh-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .shortcut-card,
  .shortcut-card:active,
  .tc-month-chip:active,
  .knj-detail-btn:active,
  .map-filter-btn:active {
    transition: none;
    transform: none;
  }
}
</style>
