<script setup lang="ts">
import {
  ref,
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
} from "@tabler/icons-vue";

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

const authStore = useAuthStore();
const router = useRouter();
const isSpkDialogVisible = ref(false);
const activeTab = ref("overview");

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
    setupRpDetailObserver();
    setupMapSpkObserver();
    setupMapKirimObserver();
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
    setupBufferObserver();
    setupBahanObserver();
    setupStokAccVsMkaObserver();
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
});

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));
const fmtDec = (val: number, d = 2) =>
  Number(val || 0).toLocaleString("id-ID", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

// ── Role helpers ──
const bagian = computed(() =>
  (authStore.user?.bagian || "").toUpperCase().trim(),
);
const isSuperViewer = computed(() =>
  ["EDP", "DIREKSI", "OWNER", "IT", "AUDIT"].includes(bagian.value),
);
const showPenawaran = computed(
  () => ["MARKETING", "FINANCE"].includes(bagian.value) || isSuperViewer.value,
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
    isSuperViewer.value,
);
const showBarangJadi = computed(
  () =>
    ["ADMIN", "PRODUKSI", "PPIC"].includes(bagian.value) || isSuperViewer.value,
);

// ── State Dashboard ──
const mapSummary = ref({
  TotalPenawaran: 0,
  SudahMAP: 0,
  BelumMAP: 0,
  BelumMAPAdaClose: 0,
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
const realisasiRows = ref<any[]>([]);
const poBpbSummary = ref({ TotalPO: 0, Open: 0, OnProses: 0, Close: 0 });
const isLoadingDashboard = ref(false);
const marketingLoaded = ref(false);
const financeLoaded = ref(false);
const gudangLoaded = ref(false);
const gudangBahanLoaded = ref(false);
const barangJadiLoaded = ref(false);
const kunjunganRows = ref<any[]>([]);
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
    RataRataHari: 0,
  },
  tren: [],
  distribusi: [],
  tabelDetail: [],
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
const aktivitasList = ref<any[]>([]);
const trendData = ref<any[]>([]);
const trendChartEl = ref<HTMLElement | null>(null);
const stokAccVsMkaCount = ref(0);

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
  if (coverageRate.value >= 100) return "#2e7d32";
  if (coverageRate.value >= 70) return "#f57f17";
  return "#c62828";
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

const pipelineStages = computed(() => [
  {
    label: "SPK Masuk",
    value: pipelineData.value.TotalMasuk,
    color: "#1565c0",
  },
  { label: "Ada MKB", value: pipelineData.value.AdaMkb, color: "#00695c" },
  {
    label: "Realisasi Minta",
    value: pipelineData.value.AdaRealisasi,
    color: "#f57f17",
  },
  { label: "LHK Cutting", value: pipelineData.value.AdaLhk, color: "#6a1b9a" },
  { label: "STBJ", value: pipelineData.value.AdaStbj, color: "#0277bd" },
  { label: "Kirim (SJ)", value: pipelineData.value.AdaKirim, color: "#2e7d32" },
]);

const pipelinePct = (value: number) => {
  const total = pipelineData.value.TotalMasuk || 1;
  return Math.round((value / total) * 100);
};

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

const pipelinePenyelesaianStages = computed(() => [
  {
    label: "SPK Aktif",
    value: pipelinePenyelesaianSpk.value.TotalAktif,
    color: "#1565c0",
  },
  {
    label: "Sudah STBJ",
    value: pipelinePenyelesaianSpk.value.SudahStbj,
    color: "#00695c",
  },
  {
    label: "Sudah Kirim",
    value: pipelinePenyelesaianSpk.value.SudahKirim,
    color: "#f57f17",
  },
  {
    label: "Full Invoice",
    value: pipelinePenyelesaianSpk.value.FullInvoice,
    color: "#2e7d32",
  },
]);

const pipelinePenyelesaianPct = (value: number) => {
  const total = pipelinePenyelesaianSpk.value.TotalAktif || 1;
  return Math.round((value / total) * 100);
};

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
    const res = await dashboardService.getMutasiBarangJadiList(
      MUTASI_BJ_PAGE_SIZE,
      mutasiBjOffset.value,
    );
    const rows: MutasiBarangJadiItem[] = res.data.data;
    mutasiBarangJadiList.value.push(...rows);
    mutasiBjOffset.value += rows.length;
    if (rows.length < MUTASI_BJ_PAGE_SIZE) mutasiBjHasMore.value = false;
  } catch {
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
    const res = await dashboardService.getPenawaranBelumSpk(
      PEN_PAGE_SIZE,
      penOffset.value,
    );
    const rows: any[] = res.data.data;
    penawaranBelumSpk.value.push(...rows);
    penOffset.value += rows.length;
    if (rows.length < PEN_PAGE_SIZE) penHasMore.value = false;
  } catch {
    /* silent */
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
    const res = await dashboardService.getPenawaranBelumMap(
      MAP_PAGE_SIZE,
      mapOffset.value,
    );
    const rows: any[] = res.data.data;
    penawaranBelumMap.value.push(...rows);
    mapOffset.value += rows.length;
    if (rows.length < MAP_PAGE_SIZE) mapHasMore.value = false;
  } catch {
    /* silent */
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
    const res = await dashboardService.getPiutangOverdue(
      OVERDUE_PAGE_SIZE,
      overdueOffset.value,
    );
    const rows: OverdueItem[] = res.data.data;
    overdueList.value.push(...rows);
    overdueOffset.value += rows.length;
    if (rows.length < OVERDUE_PAGE_SIZE) overdueHasMore.value = false;
  } catch {
    /* silent */
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
    const res = await dashboardService.getGudangBahanBuffer(
      BUFFER_PAGE_SIZE,
      bufferOffset.value,
    );
    const rows: BufferItem[] = res.data.data;
    bufferList.value.push(...rows);
    bufferOffset.value += rows.length;
    if (rows.length < BUFFER_PAGE_SIZE) bufferHasMore.value = false;
  } catch {
    /* silent */
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
    const res = await dashboardService.getGudangBahanBarcode(
      BAHAN_PAGE_SIZE,
      bahanOffset.value,
    );
    const rows: BahanBarcodeItem[] = res.data.data;
    bahanList.value.push(...rows);
    bahanOffset.value += rows.length;
    if (rows.length < BAHAN_PAGE_SIZE) bahanHasMore.value = false;
  } catch {
    /* silent */
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
    const res = await dashboardService.getRealisasiPenawaranDetail(
      RP_DETAIL_PAGE_SIZE,
      rpDetailOffset.value,
    );
    const rows: RealisasiDetailItem[] = res.data.data;
    rpDetailList.value.push(...rows);
    rpDetailOffset.value += rows.length;
    if (rows.length < RP_DETAIL_PAGE_SIZE) rpDetailHasMore.value = false;
  } catch {
    /* silent */
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

// ── Filter global MAP ──
const mapFilter = ref({
  startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .substring(0, 10),
  endDate: new Date().toISOString().substring(0, 10),
});

// ── State MAP vs SPK ──
interface MapVsSpkMetric {
  TotalMAP: number;
  SudahSPK: number;
  BelumSPK: number;
  TotalNilai: number;
  NilaiSudahSPK: number;
  NilaiBelumSPK: number;
}
interface MapDivisiItem {
  Divisi: string;
  TotalMAP: number;
  SudahSPK: number;
  NilaiSPK: number;
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
  SudahSPK: 0,
  BelumSPK: 0,
  TotalNilai: 0,
  NilaiSudahSPK: 0,
  NilaiBelumSPK: 0,
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
    const res = await dashboardService.getMapBelumSpk(
      MAP_SPK_PAGE_SIZE,
      mapSpkOffset.value,
      mapFilter.value.startDate,
      mapFilter.value.endDate,
    );
    const rows: MapBelumSpkItem[] = res.data.data;
    mapSpkList.value.push(...rows);
    mapSpkOffset.value += rows.length;
    if (rows.length < MAP_SPK_PAGE_SIZE) mapSpkHasMore.value = false;
  } catch {
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
    const res = await dashboardService.getMapBelumKirim(
      MAP_KIRIM_PAGE_SIZE,
      mapKirimOffset.value,
      mapFilter.value.startDate,
      mapFilter.value.endDate,
    );
    const rows: MapBelumKirimItem[] = res.data.data;
    mapKirimList.value.push(...rows);
    mapKirimOffset.value += rows.length;
    if (rows.length < MAP_KIRIM_PAGE_SIZE) mapKirimHasMore.value = false;
  } catch {
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
    const res = await dashboardService.getBahanKurangList(
      BAHAN_KURANG_PAGE_SIZE,
      bahanKurangOffset.value,
    );
    const rows: BahanKurangItem[] = res.data.data;
    bahanKurangList.value.push(...rows);
    bahanKurangOffset.value += rows.length;
    if (rows.length < BAHAN_KURANG_PAGE_SIZE) bahanKurangHasMore.value = false;
  } catch {
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
    const res = await dashboardService.getStokAccVsMkaList(
      STOK_ACC_MKA_PAGE_SIZE,
      stokAccVsMkaOffset.value,
    );
    const rows: StokAccVsMkaItem[] = res.data.data;
    stokAccVsMkaList.value.push(...rows);
    stokAccVsMkaOffset.value += rows.length;
    if (rows.length < STOK_ACC_MKA_PAGE_SIZE) stokAccVsMkaHasMore.value = false;
  } catch {
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
    const res = await dashboardService.getSpkBelumMkbListPaged(
      SPK_BELUM_MKB_PAGE_SIZE,
      spkBelumMkbOffset.value,
    );
    const rows: SpkBelumMkbItem[] = res.data.data;
    spkBelumMkbList.value.push(...rows);
    spkBelumMkbOffset.value += rows.length;
    if (rows.length < SPK_BELUM_MKB_PAGE_SIZE) spkBelumMkbHasMore.value = false;
  } catch {
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
    const res = await dashboardService.getOutstandingPoMitraList(
      OUTSTANDING_PAGE_SIZE,
      outstandingOffset.value,
    );
    const rows: OutstandingMitraItem[] = res.data.data;
    outstandingPoMitraList.value.push(...rows);
    outstandingOffset.value += rows.length;
    if (rows.length < OUTSTANDING_PAGE_SIZE) outstandingHasMore.value = false;
  } catch {
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
    const res = await dashboardService.getEfisiensiBabaranList(
      EFISIENSI_PAGE_SIZE,
      efisiensiOffset.value,
    );
    const rows: EfisiensiBabaranItem[] = res.data.data;
    efisiensiBabaranList.value.push(...rows);
    efisiensiOffset.value += rows.length;
    if (rows.length < EFISIENSI_PAGE_SIZE) efisiensiHasMore.value = false;
  } catch {
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

// ── Computed helpers MAP ──
const mapSpkRate = computed(() => {
  if (!mapSpkMetric.value.TotalMAP) return 0;
  return Math.round(
    (mapSpkMetric.value.SudahSPK / mapSpkMetric.value.TotalMAP) * 100,
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
    /* silent */
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

  // ── Destroy chart lama kalau ada ──
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
        ["SPK Baru", ...trendData.value.map((r: any) => r.spk_baru)],
        ["Penawaran", ...trendData.value.map((r: any) => r.penawaran_baru)],
      ],
      type: "line",
      colors: { "SPK Baru": "#1565c0", Penawaran: "#f57f17" },
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
  SPK: "#1565c0",
  SO: "#0277bd",
  MAP: "#00695c",
  SJ: "#00897b",
  PENAWARAN: "#6a1b9a",
  INVOICE: "#2e7d32",
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
  pollingTimer = setInterval(pollLightData, 30_000); // 30 detik
};

const stopPolling = () => {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
};

// ── Overview (selalu di-fetch saat mount, tab ini selalu terlihat) ──
const loadOverviewData = async () => {
  isLoadingDashboard.value = true;
  try {
    aktivitasList.value = [];
    aktOffset.value = 0;
    aktHasMore.value = true;

    const [rTrend] = await Promise.allSettled([
      dashboardService.getTrendSpk7Hari(),
    ]);
    if (rTrend.status === "fulfilled") {
      trendData.value = rTrend.value.data.data || [];
      renderTrendChart();
    }

    await loadMoreAktivitas();

    const [spkSumRes] = await Promise.allSettled([
      dashboardService.getSpkSummary(),
    ]);
    if (spkSumRes.status === "fulfilled") {
      spkSummary.value = spkSumRes.value.data.data;
      animatedSpkAktif.value = spkSummary.value.TotalAktif;
      animatedTerlambat.value = spkSummary.value.Terlambat;
      animatedDeadlineHariIni.value = spkSummary.value.DeadlineHariIni;
      animatedSegera.value = spkSummary.value.SegeredDeadline;
    }
    animatedAktivitasCount.value = aktivitasList.value.length;
  } finally {
    isLoadingDashboard.value = false;
  }
};

// ── Shortcut card di Overview — cuma summary ringan (bukan list
// penuh), biar card gak nunjukin 0 padahal tabnya belum dibuka ──
const loadOverviewShortcuts = async () => {
  const calls: Promise<any>[] = [];

  if (showPenawaran.value) {
    calls.push(
      dashboardService
        .getPenawaranSummary()
        .then((res) => {
          penSummary.value = res.data.data;
        })
        .catch(() => {}),
    );
    calls.push(
      dashboardService
        .getPenawaranMapSummary()
        .then((res) => {
          mapSummary.value = res.data.data;
        })
        .catch(() => {}),
    );
  }
  if (showPiutang.value) {
    calls.push(
      dashboardService
        .getPiutangDashboard()
        .then((res) => {
          if (res.data?.data?.summary)
            piutangData.value.summary = res.data.data.summary;
        })
        .catch(() => {}),
    );
  }
  if (showPoBpb.value) {
    calls.push(
      dashboardService
        .getSpkVsStbjSummary(
          pipelineFilter.value.startDate,
          pipelineFilter.value.endDate,
        )
        .then((res) => {
          if (res.data?.data) spkVsStbjSummary.value = res.data.data;
        })
        .catch(() => {}),
    );
    calls.push(
      dashboardService
        .getSpkVsSjSummary(
          pipelineFilter.value.startDate,
          pipelineFilter.value.endDate,
        )
        .then((res) => {
          if (res.data?.data) spkVsSjSummary.value = res.data.data;
        })
        .catch(() => {}),
    );
  }
  if (showGudangBahan.value) {
    calls.push(
      dashboardService
        .getGudangBahanDashboard()
        .then((res) => {
          if (res.data?.data?.metric)
            gudangBahanData.value.metric = res.data.data.metric;
        })
        .catch(() => {}),
    );
  }
  if (showBarangJadi.value) {
    calls.push(
      dashboardService
        .getBarangJadiMetric()
        .then((res) => {
          if (res.data?.data) barangJadiMetric.value = res.data.data;
        })
        .catch(() => {}),
    );
  }

  await Promise.allSettled(calls);
};

// ── Marketing ──
const loadMarketingData = async () => {
  if (!showPenawaran.value) return;
  isLoadingDashboard.value = true;
  try {
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

    const [sumRes, realisasiRes, mapSumRes, kunjunganRes, realisasiPenRes] =
      await Promise.allSettled([
        dashboardService.getPenawaranSummary(),
        dashboardService.getRealisasiSummary(),
        dashboardService.getPenawaranMapSummary(),
        dashboardService.getKunjunganSalesSummary(),
        dashboardService.getRealisasiPenawaranDashboard(),
      ]);
    if (sumRes.status === "fulfilled")
      penSummary.value = sumRes.value.data.data;
    if (realisasiRes.status === "fulfilled")
      realisasiRows.value = realisasiRes.value.data.data;
    if (mapSumRes.status === "fulfilled")
      mapSummary.value = mapSumRes.value.data.data;
    if (kunjunganRes.status === "fulfilled")
      kunjunganRows.value = kunjunganRes.value.data.data || [];
    if (
      realisasiPenRes.status === "fulfilled" &&
      realisasiPenRes.value?.data?.data
    ) {
      realisasiPenawaranData.value = realisasiPenRes.value.data.data;
    }

    await Promise.allSettled([
      loadMorePenawaran(),
      loadMoreMap(),
      loadMoreRpDetail(),
    ]);

    const [mapVsSpkRes, mapVsSjRes] = await Promise.allSettled([
      dashboardService.getMapVsSpkDashboard(
        mapFilter.value.startDate,
        mapFilter.value.endDate,
      ),
      dashboardService.getMapVsSjDashboard(
        mapFilter.value.startDate,
        mapFilter.value.endDate,
      ),
    ]);
    if (mapVsSpkRes.status === "fulfilled" && mapVsSpkRes.value?.data?.data) {
      mapSpkMetric.value = mapVsSpkRes.value.data.data.metric;
      mapDivisi.value = mapVsSpkRes.value.data.data.divisi;
    }
    if (mapVsSjRes.status === "fulfilled" && mapVsSjRes.value?.data?.data) {
      mapSjMetric.value = mapVsSjRes.value.data.data;
    }
    await Promise.allSettled([loadMoreMapSpk(), loadMoreMapKirim()]);

    marketingLoaded.value = true;
  } finally {
    isLoadingDashboard.value = false;
  }
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

  isLoadingGudangBahan.value = true;
  try {
    const [gbRes, stokAccMkaCountRes] = await Promise.allSettled([
      dashboardService.getGudangBahanDashboard(),
      dashboardService.getStokAccVsMkaCount(),
    ]);
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

    await Promise.allSettled([
      loadMoreBuffer(),
      loadMoreBahan(),
      loadMoreStokAccVsMka(),
    ]);

    gudangBahanLoaded.value = true;
  } finally {
    isLoadingGudangBahan.value = false;
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

// ── Refresh: reload tab yang lagi aktif aja ──
const loadDashboard = async () => {
  if (activeTab.value === "overview") {
    await loadOverviewData();
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
  }
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

  try {
    const [mapVsSpkRes, mapVsSjRes] = await Promise.allSettled([
      dashboardService.getMapVsSpkDashboard(
        mapFilter.value.startDate,
        mapFilter.value.endDate,
      ),
      dashboardService.getMapVsSjDashboard(
        mapFilter.value.startDate,
        mapFilter.value.endDate,
      ),
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
  }
};

onMounted(async () => {
  // Auto-select tab berdasarkan bagian user
  if (
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

  if (
    authStore.spkUrgent?.length > 0 &&
    !sessionStorage.getItem("hasSeenSpk")
  ) {
    isSpkDialogVisible.value = true;
  }

  // Overview SELALU di-fetch (tab-nya selalu terlihat)
  await loadOverviewData();
  // Shortcut card butuh summary ringan dari tab lain, tanpa nge-load
  // list penuhnya (list tetap lazy pas tab beneran dibuka)
  loadOverviewShortcuts();

  // Kalau default tab BUKAN overview, fetch data tab itu juga
  if (activeTab.value === "marketing") await loadMarketingData();
  else if (activeTab.value === "finance") await loadFinanceData();
  else if (activeTab.value === "gudang") await loadGudangData();
  else if (activeTab.value === "gudang-bahan") await loadGudangBahanData();
  else if (activeTab.value === "barang-jadi") await loadBarangJadiData();

  startPolling();

  // Setup observer untuk tab yang aktif saat ini
  await nextTick();
  if (activeTab.value === "marketing") {
    setupPenObserver();
    setupMapObserver();
    setupRpDetailObserver();
    setupMapSpkObserver();
    setupMapKirimObserver();
  }
  if (activeTab.value === "finance") {
    setupOverdueObserver();
    setupSpkTagihObserver();
  }
  if (activeTab.value === "gudang-bahan") {
    setupBufferObserver();
    setupBahanObserver();
    setupStokAccVsMkaObserver();
  }
  if (activeTab.value === "overview") {
    setupAktObserver();
  }
  if (activeTab.value === "gudang") {
    setupGudangObservers();
  }
  if (activeTab.value === "barang-jadi") {
    setupStokBjObserver();
    setupMutasiBjObserver();
  }
});

onUnmounted(() => {
  stopPolling();
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
});

const closeSpkDialog = () => {
  isSpkDialogVisible.value = false;
  sessionStorage.setItem("hasSeenSpk", "true");
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
const totalNominal = computed(() =>
  realisasiRows.value.reduce((s, r) => s + Number(r.Nominal || 0), 0),
);
const totalClose = computed(() =>
  realisasiRows.value.reduce((s, r) => s + Number(r.Close || 0), 0),
);
const pctGlobal = computed(() =>
  totalNominal.value
    ? Math.round((totalClose.value / totalNominal.value) * 100)
    : 0,
);
const barPct = (nominal: number, close: number, batal: number) => ({
  close: nominal ? Math.round((close / nominal) * 100) : 0,
  batal: nominal ? Math.round((batal / nominal) * 100) : 0,
  open: nominal ? Math.round(((nominal - close - batal) / nominal) * 100) : 0,
});
const shortNum = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "M";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "jt";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "rb";
  return String(n);
};
const bufferPct = (stok: number, buffer: number): number => {
  if (!buffer) return 100;
  return Math.min(100, Math.round((stok / buffer) * 100));
};

const bufferColor = (pct: number): string => {
  if (pct < 20) return "#c62828";
  if (pct < 50) return "#f57f17";
  return "#2e7d32";
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
  if (collectionRate.value >= 80) return "#2e7d32";
  if (collectionRate.value >= 50) return "#f57f17";
  return "#c62828";
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
  <v-container fluid class="pa-3">
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
        <v-btn
          icon
          variant="text"
          size="small"
          :loading="isLoadingDashboard"
          title="Refresh Dashboard"
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
      style="border: 1px solid #e0e0e0; border-radius: 4px"
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
    </v-tabs>

    <v-window v-model="activeTab">
      <!-- ════════════════════════════════════════
           TAB OVERVIEW
      ════════════════════════════════════════ -->
      <v-window-item value="overview">
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
              <div class="sum-value" style="color: #e65100">
                {{ isLoadingDashboard ? "—" : animatedSegera }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Shortcut cards ke tab lain -->
        <v-row dense>
          <v-col v-if="showPenawaran" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'marketing'">
              <IconChartBar :size="20" color="#1565c0" :stroke-width="1.5" />
              <div style="flex: 1; min-width: 0">
                <div class="shortcut-title">Marketing</div>
                <div class="shortcut-sub">
                  <span v-if="isLoadingDashboard">Memuat...</span>
                  <span v-else>
                    {{ penSummary.BelumSpk }} penawaran belum SPK ·
                    {{ mapSummary.BelumMAP }} belum MAP
                  </span>
                </div>
              </div>
              <IconChevronRight :size="16" color="#9e9e9e" />
            </div>
          </v-col>
          <v-col v-if="showPiutang" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'finance'">
              <IconCoin :size="20" color="#6a1b9a" :stroke-width="1.5" />
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
              <IconChevronRight :size="16" color="#9e9e9e" />
            </div>
          </v-col>
          <v-col v-if="showGudangBahan" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'gudang-bahan'">
              <IconPackage :size="20" color="#5c6bc0" :stroke-width="1.5" />
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
              <IconChevronRight :size="16" color="#9e9e9e" />
            </div>
          </v-col>
          <v-col v-if="showPoBpb" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'gudang'">
              <IconTruckDelivery
                :size="20"
                color="#00695c"
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
              <IconChevronRight :size="16" color="#9e9e9e" />
            </div>
          </v-col>
          <v-col v-if="showBarangJadi" cols="12" sm="3">
            <div class="shortcut-card" @click="activeTab = 'barang-jadi'">
              <IconBoxSeam :size="20" color="#00695c" :stroke-width="1.5" />
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
              <IconChevronRight :size="16" color="#9e9e9e" />
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
                  style="color: #1565c0"
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
                <IconActivity :size="14" style="color: #6a1b9a" class="mr-1" />
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
                Belum MAP
                <span
                  v-if="mapSummary.BelumMAPAdaClose"
                  class="badge-count ml-1"
                  style="background: #e65100"
                >
                  {{ mapSummary.BelumMAPAdaClose }} perlu perhatian
                </span>
                <span
                  class="ml-auto d-flex align-center"
                  style="gap: 8px; font-size: 11px"
                >
                  <span
                    >Total: <b>{{ mapSummary.TotalPenawaran }}</b></span
                  >
                  <span style="color: #2e7d32"
                    >MAP: <b>{{ mapSummary.SudahMAP }}</b></span
                  >
                  <span style="color: #c62828"
                    >Belum: <b>{{ mapSummary.BelumMAP }}</b></span
                  >
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="orange"
                  height="2"
                />
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
                        router.push('/laporan/marketing/penawaran-vs-map')
                      "
                    >
                      <div class="map-item-top">
                        <span class="map-nomor">{{ p.Nomor }}</span>
                        <div class="d-flex align-center" style="gap: 5px">
                          <span
                            class="map-close-badge"
                            style="background: #e8f5e9; color: #2e7d32"
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Semua penawaran sudah ada MAP-nya 🎉
                </div>
              </div>
            </div>
          </v-col>

          <!-- Penawaran Belum SPK -->
          <v-col cols="12" md="3">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--warning">
                <IconFileAlert :size="14" :stroke-width="1.7" class="mr-1" />
                Belum SPK
                <span v-if="penSummary.BelumSpk" class="badge-count ml-auto">
                  {{ penSummary.BelumSpk }}
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="warning"
                  height="2"
                />
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
                      <span class="pen-stat-lbl">Ada SPK</span>
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
                  <div v-else class="text-center text-grey py-3 text-caption">
                    Semua penawaran sudah ada SPK-nya 🎉
                  </div>
                </template>
              </div>
            </div>
          </v-col>

          <!-- Realisasi per Divisi -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--blue">
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Realisasi Penawaran
                <span class="panel-header-sub ml-1">(bulan ini)</span>
                <span
                  v-if="totalNominal"
                  class="ml-auto pct-badge"
                  :class="
                    pctGlobal >= 80
                      ? 'pct-good'
                      : pctGlobal >= 50
                        ? 'pct-mid'
                        : 'pct-low'
                  "
                >
                  {{ pctGlobal }}% close
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="primary"
                  height="2"
                />
                <template v-else-if="realisasiRows.length">
                  <div class="real-total-row">
                    <span class="real-total-lbl">Total Nominal</span>
                    <span class="real-total-val">{{
                      shortNum(totalNominal)
                    }}</span>
                    <span class="real-total-close"
                      >Close {{ shortNum(totalClose) }}</span
                    >
                  </div>
                  <div class="real-list">
                    <div
                      v-for="row in realisasiRows"
                      :key="row.Divisi"
                      class="real-row"
                    >
                      <div class="real-meta">
                        <span class="real-divisi">{{
                          row.Divisi || "LAINNYA"
                        }}</span>
                        <span class="real-nominal">{{
                          shortNum(Number(row.Nominal))
                        }}</span>
                      </div>
                      <div class="real-bar-wrap">
                        <div class="real-bar">
                          <div
                            class="real-seg real-seg--close"
                            :style="{
                              width:
                                barPct(
                                  Number(row.Nominal),
                                  Number(row.Close),
                                  Number(row.Batal),
                                ).close + '%',
                            }"
                          />
                          <div
                            class="real-seg real-seg--batal"
                            :style="{
                              width:
                                barPct(
                                  Number(row.Nominal),
                                  Number(row.Close),
                                  Number(row.Batal),
                                ).batal + '%',
                            }"
                          />
                          <div
                            class="real-seg real-seg--open"
                            :style="{
                              width:
                                barPct(
                                  Number(row.Nominal),
                                  Number(row.Close),
                                  Number(row.Batal),
                                ).open + '%',
                            }"
                          />
                        </div>
                        <span class="real-pct">
                          {{
                            barPct(
                              Number(row.Nominal),
                              Number(row.Close),
                              Number(row.Batal),
                            ).close
                          }}%
                        </span>
                      </div>
                      <div class="real-detail">
                        <span class="rd-close"
                          >✓ {{ shortNum(Number(row.Close)) }}</span
                        >
                        <span v-if="Number(row.Batal) > 0" class="rd-batal"
                          >✕ {{ shortNum(Number(row.Batal)) }}</span
                        >
                        <span class="rd-open"
                          >○
                          {{
                            shortNum(
                              Number(row.Nominal) -
                                Number(row.Close) -
                                Number(row.Batal),
                            )
                          }}</span
                        >
                      </div>
                    </div>
                  </div>
                  <div class="real-legend">
                    <span class="leg-dot leg-close" />Close
                    <span class="leg-dot leg-batal" />Batal
                    <span class="leg-dot leg-open" />Open
                  </div>
                </template>
                <div v-else class="text-center text-grey py-3 text-caption">
                  Belum ada data penawaran bulan ini.
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row 2: Waktu Realisasi + Tabel Detail ── -->
        <v-row dense class="mb-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--blue">
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Waktu realisasi penawaran → SPK
                <span class="panel-header-sub ml-1">(90 hari terakhir)</span>
                <span
                  v-if="realisasiPenawaranData.metric.RataRataHari"
                  class="ml-auto pct-badge"
                  :class="
                    realisasiPenawaranData.metric.RataRataHari <= 14
                      ? 'pct-good'
                      : realisasiPenawaranData.metric.RataRataHari <= 30
                        ? 'pct-mid'
                        : 'pct-low'
                  "
                >
                  Rata-rata
                  {{ realisasiPenawaranData.metric.RataRataHari }} hari
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="primary"
                  height="2"
                />
                <template v-else>
                  <!-- Metric mini + stacked bar + tren — layout 2 kolom -->
                  <div
                    style="
                      display: flex;
                      gap: 0;
                      border-bottom: 1px solid #f0f0f0;
                    "
                  >
                    <!-- Kiri: metric + stacked bar -->
                    <div
                      style="
                        flex: 1;
                        padding: 10px 12px;
                        border-right: 1px solid #f0f0f0;
                      "
                    >
                      <div
                        class="rp-summary"
                        style="
                          padding: 0 0 8px;
                          border-bottom: 1px solid #f5f5f5;
                          margin-bottom: 8px;
                        "
                      >
                        <div class="rp-stat" style="padding: 2px 10px">
                          <span class="rp-val" style="color: #212121">{{
                            realisasiPenawaranData.metric.TotalPenawaran
                          }}</span>
                          <span class="rp-lbl">Total</span>
                        </div>
                        <div class="rp-divider" />
                        <div class="rp-stat" style="padding: 2px 10px">
                          <span class="rp-val" style="color: #2e7d32"
                            >{{ realisasiPenawaranData.metric.KonversiCepat }}
                            <span class="rp-pct"
                              >({{ realisasiPct.cepat }}%)</span
                            >
                          </span>
                          <span class="rp-lbl">Cepat ≤7hr</span>
                        </div>
                        <div class="rp-divider" />
                        <div class="rp-stat" style="padding: 2px 10px">
                          <span class="rp-val" style="color: #185fa5"
                            >{{ realisasiPenawaranData.metric.KonversiNormal }}
                            <span class="rp-pct"
                              >({{ realisasiPct.normal }}%)</span
                            >
                          </span>
                          <span class="rp-lbl">Normal 8–30hr</span>
                        </div>
                        <div class="rp-divider" />
                        <div class="rp-stat" style="padding: 2px 10px">
                          <span class="rp-val" style="color: #854f0b"
                            >{{ realisasiPenawaranData.metric.KonversiLambat }}
                            <span class="rp-pct"
                              >({{ realisasiPct.lambat }}%)</span
                            >
                          </span>
                          <span class="rp-lbl">Lambat 31–90hr</span>
                        </div>
                        <div class="rp-divider" />
                        <div class="rp-stat" style="padding: 2px 10px">
                          <span class="rp-val" style="color: #c62828"
                            >{{
                              realisasiPenawaranData.metric.KonversiSangatLambat
                            }}
                            <span class="rp-pct"
                              >({{ realisasiPct.sangatLambat }}%)</span
                            >
                          </span>
                          <span class="rp-lbl">&gt;90hr</span>
                        </div>
                        <div class="rp-divider" />
                        <div class="rp-stat" style="padding: 2px 10px">
                          <span class="rp-val" style="color: #616161"
                            >{{ realisasiPenawaranData.metric.BelumKonversi }}
                            <span class="rp-pct"
                              >({{ realisasiPct.belum }}%)</span
                            >
                          </span>
                          <span class="rp-lbl">Belum SPK</span>
                        </div>
                      </div>

                      <!-- Stacked bar -->
                      <div v-if="realisasiPenawaranData.metric.TotalPenawaran">
                        <div class="rp-stack">
                          <div
                            class="rp-seg"
                            :style="{
                              width: realisasiPct.cepat + '%',
                              background: '#2e7d32',
                            }"
                          >
                            <span v-if="realisasiPct.cepat >= 8"
                              >{{ realisasiPct.cepat }}%</span
                            >
                          </div>
                          <div
                            class="rp-seg"
                            :style="{
                              width: realisasiPct.normal + '%',
                              background: '#185FA5',
                            }"
                          >
                            <span v-if="realisasiPct.normal >= 8"
                              >{{ realisasiPct.normal }}%</span
                            >
                          </div>
                          <div
                            class="rp-seg"
                            :style="{
                              width: realisasiPct.lambat + '%',
                              background: '#f57f17',
                            }"
                          >
                            <span v-if="realisasiPct.lambat >= 8"
                              >{{ realisasiPct.lambat }}%</span
                            >
                          </div>
                          <div
                            class="rp-seg"
                            :style="{
                              width: realisasiPct.sangatLambat + '%',
                              background: '#c62828',
                            }"
                          >
                            <span v-if="realisasiPct.sangatLambat >= 8"
                              >{{ realisasiPct.sangatLambat }}%</span
                            >
                          </div>
                          <div
                            class="rp-seg"
                            :style="{
                              width: realisasiPct.belum + '%',
                              background: '#bdbdbd',
                            }"
                          >
                            <span v-if="realisasiPct.belum >= 8"
                              >{{ realisasiPct.belum }}%</span
                            >
                          </div>
                        </div>
                        <div class="rp-legend">
                          <span
                            ><span
                              class="leg-dot"
                              style="background: #2e7d32"
                            />Cepat ≤7hr</span
                          >
                          <span
                            ><span
                              class="leg-dot"
                              style="background: #185fa5"
                            />Normal 8–30hr</span
                          >
                          <span
                            ><span
                              class="leg-dot"
                              style="background: #f57f17"
                            />Lambat 31–90hr</span
                          >
                          <span
                            ><span
                              class="leg-dot"
                              style="background: #c62828"
                            />&gt;90hr</span
                          >
                          <span
                            ><span
                              class="leg-dot"
                              style="background: #bdbdbd"
                            />Belum SPK</span
                          >
                        </div>
                      </div>
                    </div>

                    <!-- Kanan: tren per bulan -->
                    <div
                      v-if="realisasiPenawaranData.tren.length"
                      style="width: 280px; flex-shrink: 0; padding: 10px 12px"
                    >
                      <div class="rp-tren-title">
                        Tren rata-rata hari / bulan
                      </div>
                      <div class="rp-tren-list">
                        <div
                          v-for="t in realisasiPenawaranData.tren"
                          :key="t.Bulan"
                          class="rp-tren-row"
                        >
                          <span class="rp-tren-bulan">{{ t.Bulan }}</span>
                          <div class="rp-tren-bar-wrap">
                            <div class="rp-tren-track">
                              <div
                                class="rp-tren-fill"
                                :style="{
                                  width:
                                    Math.min(100, (t.RataRataHari / 60) * 100) +
                                    '%',
                                  background:
                                    t.RataRataHari <= 14
                                      ? '#2e7d32'
                                      : t.RataRataHari <= 30
                                        ? '#185FA5'
                                        : '#c62828',
                                }"
                              />
                              <div
                                class="rp-target-line"
                                style="left: calc(14 / 60 * 100%)"
                              />
                            </div>
                          </div>
                          <span
                            class="rp-tren-val"
                            :style="{
                              color:
                                t.RataRataHari <= 14
                                  ? '#2e7d32'
                                  : t.RataRataHari <= 30
                                    ? '#185FA5'
                                    : '#c62828',
                            }"
                          >
                            {{
                              t.RataRataHari !== null
                                ? t.RataRataHari + " hr"
                                : "—"
                            }}
                          </span>
                          <span class="rp-tren-konversi"
                            >{{ t.Konversi }}/{{ t.TotalPenawaran }}</span
                          >
                        </div>
                      </div>
                      <div class="rp-legend" style="margin-top: 6px">
                        <span
                          style="display: flex; align-items: center; gap: 4px"
                        >
                          <span
                            style="
                              width: 12px;
                              height: 2px;
                              border-top: 2px dashed #9e9e9e;
                              display: inline-block;
                            "
                          ></span>
                          Target 14 hari
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Tabel detail — infinite scroll -->
                  <div
                    style="
                      overflow-x: auto;
                      max-height: 320px;
                      overflow-y: auto;
                    "
                  >
                    <table class="rp-tbl">
                      <thead>
                        <tr>
                          <th style="width: 160px">No. penawaran</th>
                          <th style="width: 95px; text-align: center">
                            Tgl penawaran
                          </th>
                          <th style="min-width: 160px">Customer</th>
                          <th style="width: 70px; text-align: center">
                            Total SPK
                          </th>
                          <th style="width: 150px">SPK pertama</th>
                          <th style="width: 95px; text-align: center">
                            Tgl SPK
                          </th>
                          <th style="width: 70px; text-align: right">Hari</th>
                          <th style="width: 90px; text-align: center">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(row, idx) in rpDetailList" :key="idx">
                          <td
                            style="
                              font-family: monospace;
                              color: #1565c0;
                              font-weight: 600;
                            "
                          >
                            {{ row.NomorPenawaran }}
                          </td>
                          <td style="text-align: center">
                            {{ row.TglPenawaran }}
                          </td>
                          <td
                            style="
                              overflow: hidden;
                              text-overflow: ellipsis;
                              white-space: nowrap;
                              max-width: 160px;
                            "
                            :title="row.Customer"
                          >
                            {{ row.Customer }}
                          </td>
                          <td style="text-align: center; font-weight: 600">
                            {{ row.TotalSPK || "—" }}
                          </td>
                          <td
                            style="
                              font-family: monospace;
                              font-size: 10px;
                              color: #424242;
                            "
                          >
                            {{ row.SpkPertama || "—" }}
                          </td>
                          <td style="text-align: center">
                            {{ row.TglSpkPertama || "—" }}
                          </td>
                          <td
                            style="text-align: right; font-weight: 600"
                            :style="{
                              color:
                                row.HariKonversi === null
                                  ? '#9e9e9e'
                                  : row.HariKonversi <= 7
                                    ? '#2e7d32'
                                    : row.HariKonversi <= 30
                                      ? '#185FA5'
                                      : '#c62828',
                            }"
                          >
                            {{
                              row.HariKonversi !== null ? row.HariKonversi : "—"
                            }}
                          </td>
                          <td style="text-align: center">
                            <span
                              v-if="row.HariKonversi === null"
                              class="rp-badge rp-badge--none"
                              >Belum</span
                            >
                            <span
                              v-else-if="row.HariKonversi <= 7"
                              class="rp-badge rp-badge--fast"
                              >Cepat</span
                            >
                            <span
                              v-else-if="row.HariKonversi <= 30"
                              class="rp-badge rp-badge--mid"
                              >Normal</span
                            >
                            <span
                              v-else-if="row.HariKonversi <= 90"
                              class="rp-badge rp-badge--slow"
                              >Lambat</span
                            >
                            <span v-else class="rp-badge rp-badge--vslow"
                              >&gt;90hr</span
                            >
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <!-- Sentinel -->
                    <div
                      ref="rpDetailSentinelEl"
                      style="padding: 6px; text-align: center"
                    >
                      <span v-if="isLoadingMoreRpDetail" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!rpDetailHasMore && rpDetailList.length"
                        class="pen-end"
                      >
                        {{ rpDetailList.length }} penawaran ditampilkan
                      </span>
                    </div>
                  </div>
                </template>
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
                <span class="panel-header-sub ml-1">(bulan ini)</span>
                <button
                  class="po-bpb-link ml-auto"
                  @click="goToKunjunganDetail()"
                >
                  Lihat Semua →
                </button>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="green"
                  height="2"
                />
                <template v-else-if="kunjunganRows.length">
                  <div class="knj-wrap">
                    <div
                      v-for="row in kunjunganRows"
                      :key="row.Nama_Sales"
                      class="knj-row"
                    >
                      <div class="knj-meta">
                        <span class="knj-sales">{{ row.Nama_Sales }}</span>
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
                    <span class="leg-dot" style="background: #43a047" />Done
                    <span
                      class="leg-dot ml-2"
                      style="background: #90caf9"
                    />Unplan
                    <span
                      class="leg-dot ml-2"
                      style="background: #e53935"
                    />Failed
                    <span class="ml-2" style="font-size: 10px"
                      >P = Penawaran · MH = Minta Harga</span
                    >
                  </div>
                </template>
                <div v-else class="text-center text-grey py-3 text-caption">
                  Belum ada data kunjungan bulan ini.
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- ── Row 4: Filter + MAP vs SPK / SJ ── -->
        <v-row dense class="mt-2 mb-1">
          <v-col cols="12">
            <div class="d-flex align-center" style="gap: 8px; padding: 0 2px">
              <span class="text-caption text-grey-darken-1 font-weight-bold"
                >Filter MAP:</span
              >
              <input
                type="date"
                v-model="mapFilter.startDate"
                class="map-date-inp"
              />
              <span class="text-caption text-grey">s.d</span>
              <input
                type="date"
                v-model="mapFilter.endDate"
                class="map-date-inp"
              />
              <button class="map-filter-btn" @click="reloadMapPanels">
                Terapkan
              </button>
            </div>
          </v-col>
        </v-row>

        <v-row dense>
          <!-- Panel 1: Konversi MAP → SPK -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--blue">
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Konversi MAP → SPK
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
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="primary"
                  height="2"
                />
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
                        mapSpkMetric.SudahSPK
                      }}</span>
                      <span class="pen-stat-lbl">Sudah SPK</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-error">{{
                        mapSpkMetric.BelumSPK
                      }}</span>
                      <span class="pen-stat-lbl">Belum SPK</span>
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
                          SPK {{ shortNum(row.NilaiSPK) }} | Pot
                          {{ shortNum(row.NilaiPotensi) }}
                        </span>
                      </div>
                      <div class="real-bar-wrap">
                        <div class="real-bar">
                          <div
                            class="real-seg real-seg--close"
                            :style="{
                              width:
                                row.NilaiSPK + row.NilaiPotensi
                                  ? (row.NilaiSPK /
                                      (row.NilaiSPK + row.NilaiPotensi)) *
                                      100 +
                                    '%'
                                  : '0%',
                            }"
                          />
                          <div
                            class="real-seg real-seg--open"
                            :style="{
                              width:
                                row.NilaiSPK + row.NilaiPotensi
                                  ? (row.NilaiPotensi /
                                      (row.NilaiSPK + row.NilaiPotensi)) *
                                      100 +
                                    '%'
                                  : '0%',
                            }"
                          />
                        </div>
                        <span class="real-pct">
                          {{
                            row.NilaiSPK + row.NilaiPotensi
                              ? Math.round(
                                  (row.NilaiSPK /
                                    (row.NilaiSPK + row.NilaiPotensi)) *
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
                      border-top: 1px solid #f0f0f0;
                      padding: 5px 12px 0;
                      font-size: 10px;
                      color: #9e9e9e;
                      font-weight: 600;
                    "
                  >
                    MAP BELUM SPK
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
                            color: #6a1b9a;
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
                    Semua MAP sudah ada SPK-nya 🎉
                  </div>
                </template>
              </div>
            </div>
          </v-col>

          <!-- Panel 2: Status Pengiriman MAP -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--teal">
                <IconTruckDelivery
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Status Pengiriman MAP
                <span class="ml-auto" style="font-size: 11px">
                  {{ mapKirimRate }}% terkirim
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="teal"
                  height="2"
                />
                <template v-else>
                  <!-- 3 bucket card -->
                  <div
                    class="aging-wrap"
                    style="grid-template-columns: repeat(3, 1fr)"
                  >
                    <div
                      class="aging-chip"
                      style="background: #ffebee; color: #c62828"
                    >
                      <span class="aging-count">{{
                        mapSjMetric.BelumKirim
                      }}</span>
                      <span class="aging-label">Belum Kirim</span>
                    </div>
                    <div
                      class="aging-chip"
                      style="background: #fff8e1; color: #f57f17"
                    >
                      <span class="aging-count">{{
                        mapSjMetric.SebagianKirim
                      }}</span>
                      <span class="aging-label">Sebagian</span>
                    </div>
                    <div
                      class="aging-chip"
                      style="background: #e8f5e9; color: #2e7d32"
                    >
                      <span class="aging-count">{{
                        mapSjMetric.LunasKirim
                      }}</span>
                      <span class="aging-label">Lunas Kirim</span>
                    </div>
                  </div>

                  <!-- Progress bar qty -->
                  <div
                    style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0"
                  >
                    <div class="d-flex justify-space-between mb-1">
                      <span style="font-size: 10px; color: #9e9e9e"
                        >Total qty terkirim</span
                      >
                      <span
                        style="
                          font-size: 10px;
                          font-weight: 700;
                          color: #00695c;
                        "
                      >
                        {{ fmtNum(mapSjMetric.TotalQtyKirim) }} /
                        {{ fmtNum(mapSjMetric.TotalQtyOrder) }}
                      </span>
                    </div>
                    <div class="cr-bar">
                      <div
                        class="cr-fill"
                        :style="{
                          width: mapSjMetric.TotalQtyOrder
                            ? Math.min(
                                100,
                                (mapSjMetric.TotalQtyKirim /
                                  mapSjMetric.TotalQtyOrder) *
                                  100,
                              ) + '%'
                            : '0%',
                          background: '#00897b',
                        }"
                      />
                    </div>
                  </div>

                  <!-- Divider label -->
                  <div
                    style="
                      border-top: 1px solid #f0f0f0;
                      padding: 5px 12px 0;
                      font-size: 10px;
                      color: #9e9e9e;
                      font-weight: 600;
                    "
                  >
                    MAP BELUM / SEBAGIAN KIRIM
                  </div>

                  <!-- Infinite scroll -->
                  <div class="pen-list" style="max-height: 280px">
                    <div
                      v-for="m in mapKirimList"
                      :key="m.Nomor"
                      class="pen-item"
                      :class="m.QtyKirim === 0 ? 'umur-danger' : 'umur-warn'"
                    >
                      <div class="pen-item-top">
                        <span class="pen-nomor">{{ m.Nomor }}</span>
                        <span class="pen-divisi">{{ m.Divisi }}</span>
                      </div>
                      <div class="pen-cus">{{ m.NamaCustomer }}</div>
                      <div class="d-flex justify-space-between mt-1">
                        <span class="pen-ket">DL: {{ m.Dateline }}</span>
                        <span
                          :style="{
                            fontSize: '10px',
                            fontWeight: '700',
                            color: m.QtyKirim === 0 ? '#c62828' : '#f57f17',
                          }"
                        >
                          {{ fmtNum(m.QtyKirim) }}/{{ fmtNum(m.QtyOrder) }} pcs
                        </span>
                      </div>
                    </div>
                    <div ref="mapKirimSentinelEl" class="pen-sentinel">
                      <span v-if="isLoadingMoreMapKirim" class="pen-loading"
                        >Memuat...</span
                      >
                      <span
                        v-else-if="!mapKirimHasMore && mapKirimList.length"
                        class="pen-end"
                      >
                        {{ mapKirimList.length }} MAP ditampilkan
                      </span>
                    </div>
                  </div>
                  <div
                    v-if="!mapKirimList.length && !isLoadingMoreMapKirim"
                    class="text-center text-grey py-3 text-caption"
                  >
                    Semua MAP sudah lunas kirim 🎉
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
                  background: #f3e5f5;
                  color: #6a1b9a;
                  border-bottom: 1px solid #e1bee7;
                "
              >
                <IconCoin :size="14" :stroke-width="1.7" class="mr-1" />
                Nilai Pipeline MAP
                <span class="panel-header-sub ml-1"
                  >({{ mapFilter.startDate }} s.d {{ mapFilter.endDate }})</span
                >
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="purple"
                  height="2"
                />
                <template v-else>
                  <!-- Total nilai -->
                  <div
                    style="
                      padding: 8px 12px;
                      border-bottom: 1px solid #f0f0f0;
                      display: flex;
                      gap: 0;
                      background: #fafafa;
                    "
                  >
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val"
                        style="color: #6a1b9a; font-size: 14px"
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
                        {{ shortNum(mapSpkMetric.NilaiSudahSPK) }}
                      </span>
                      <span class="pen-stat-lbl">Confirmed (SPK)</span>
                    </div>
                    <div class="pen-stat">
                      <span
                        class="pen-stat-val text-warning"
                        style="font-size: 14px"
                      >
                        {{ shortNum(mapSpkMetric.NilaiBelumSPK) }}
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
                        <span class="knj-sales" style="color: #4a148c">{{
                          row.Divisi
                        }}</span>
                        <span
                          class="knj-pct"
                          style="color: #6a1b9a; font-weight: 700"
                        >
                          {{ shortNum(row.NilaiSPK + row.NilaiPotensi) }}
                        </span>
                      </div>
                      <div class="knj-bar-wrap">
                        <div class="knj-bar" style="background: #f3e5f5">
                          <!-- SPK (confirmed) -->
                          <div
                            class="knj-seg"
                            style="background: #7b1fa2"
                            :style="{
                              width: mapSpkMetric.TotalNilai
                                ? (row.NilaiSPK / mapSpkMetric.TotalNilai) *
                                    100 +
                                  '%'
                                : '0%',
                            }"
                          />
                          <!-- Potensi -->
                          <div
                            class="knj-seg"
                            style="background: #ce93d8"
                            :style="{
                              width: mapSpkMetric.TotalNilai
                                ? (row.NilaiPotensi / mapSpkMetric.TotalNilai) *
                                    100 +
                                  '%'
                                : '0%',
                            }"
                          />
                        </div>
                      </div>
                      <div class="real-detail mt-1">
                        <span style="color: #7b1fa2"
                          >✓ {{ shortNum(row.NilaiSPK) }}</span
                        >
                        <span style="color: #9c27b0"
                          >○ {{ shortNum(row.NilaiPotensi) }}</span
                        >
                        <span style="color: #9e9e9e"
                          >{{ row.SudahSPK }}/{{ row.TotalMAP }} MAP</span
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
                      style="background: #7b1fa2"
                    />Confirmed (SPK)
                    <span class="leg-dot" style="background: #ce93d8" />Potensi
                  </div>
                </template>
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
              <div class="sum-value" style="color: #e65100">
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

        <!-- ── Baris 3: Panel utama 3 kolom ── -->
        <v-row dense>
          <!-- Panel Invoice Overdue -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: #ffebee;
                  color: #c62828;
                  border-bottom: 1px solid #ffcdd2;
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
                  style="background: #c62828"
                >
                  {{ piutangData.summary.overdueTotal }} Tagihan
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="red"
                  height="2"
                />
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
                  <div v-else class="text-center text-grey py-3 text-caption">
                    Tidak ada invoice yang melewati jatuh tempo 🎉
                  </div>
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
                  background: #f3e5f5;
                  color: #6a1b9a;
                  border-bottom: 1px solid #e1bee7;
                "
              >
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Top Piutang Terbesar
              </div>
              <div class="panel-body pa-2">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="purple"
                  height="2"
                />
                <template v-else>
                  <div class="knj-wrap" style="max-height: 450px">
                    <div
                      v-for="(top, i) in piutangData.top5"
                      :key="i"
                      class="knj-row"
                    >
                      <div class="knj-meta mb-1">
                        <span class="knj-sales" style="color: #4a148c">{{
                          top.Customer
                        }}</span>
                        <span
                          class="knj-pct"
                          style="color: #6a1b9a; font-weight: 700"
                        >
                          {{ shortNum(top.Saldo) }}
                        </span>
                      </div>
                      <div class="knj-bar-wrap">
                        <div class="knj-bar" style="background: #f3e5f5">
                          <div
                            class="knj-seg"
                            style="background: #ab47bc"
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
                  background: #e3f2fd;
                  color: #1565c0;
                  border-bottom: 1px solid #bbdefb;
                "
              >
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Trend Tagihan vs Penerimaan
                <span class="panel-header-sub ml-1">(6 bln)</span>
              </div>
              <div class="panel-body pa-3">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="blue"
                  height="2"
                />
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
                          style="font-size: 11px; color: #424242"
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
                        color="#f0f0f0"
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
                  background: #fff3e0;
                  color: #e65100;
                  border-bottom: 1px solid #ffe0b2;
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
                  style="background: #e65100"
                >
                  {{
                    spkBelumTagihSummary.BelumInvoice +
                    spkBelumTagihSummary.SebagianInvoice
                  }}
                  SPK
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="warning"
                  height="2"
                />
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
                      <span class="pen-stat-val" style="color: #f57f17">{{
                        spkBelumTagihSummary.SebagianInvoice
                      }}</span>
                      <span class="pen-stat-lbl">Sebagian</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val text-success">{{
                        spkBelumTagihSummary.FullInvoice
                      }}</span>
                      <span class="pen-stat-lbl">Full Invoice</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val" style="color: #e65100">{{
                        fmtNum(spkBelumTagihSummary.TotalQtyBelumDitagih)
                      }}</span>
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
                            color: #e65100;
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
                  <div v-else class="text-center text-grey py-3 text-caption">
                    Semua SPK terkirim sudah full invoice 🎉
                  </div>
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
              <div class="sum-value" style="color: #e65100">
                <span v-if="isLoadingGudangBahan">—</span>
                <span v-else>{{ gudangBahanData.metric.JmlMinus }}</span>
              </div>
              <div class="sum-sub">stok negatif perlu investigasi</div>
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
                  background: #fff8e1;
                  color: #854f0b;
                  border-bottom: 1px solid #ffe0b2;
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
                  style="background: #854f0b"
                >
                  {{ gudangBahanData.metric.JmlBawahBuffer }} item
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingGudangBahan"
                  indeterminate
                  color="warning"
                  height="2"
                />
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Semua stok di atas buffer 🎉
                </div>
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
                <v-progress-linear
                  v-if="isLoadingGudangBahan"
                  indeterminate
                  color="primary"
                  height="2"
                />
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
                              background: '#185FA5',
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Belum ada data stok.
                </div>
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
                  background: #fff3e0;
                  color: #e65100;
                  border-bottom: 1px solid #ffe0b2;
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
                  style="background: #e65100"
                >
                  {{ stokAccVsMkaCount }} item
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingGudangBahan"
                  indeterminate
                  color="warning"
                  height="2"
                />
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
                              color: #e65100;
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Semua aksesoris tercukupi untuk kebutuhan MKA bulan ini 🎉
                </div>
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
                <v-progress-linear
                  v-if="isLoadingGudangBahan"
                  indeterminate
                  color="teal"
                  height="2"
                />
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
                          <td class="tr" style="color: #2e7d32">
                            +{{ fmtNum(item.Masuk) }}
                          </td>
                          <td class="tr" style="color: #c62828">
                            -{{ fmtNum(item.Keluar) }}
                          </td>
                          <td
                            class="tr"
                            :style="{
                              fontWeight: '600',
                              color:
                                item.Stok < 0
                                  ? '#c62828'
                                  : item.Stok === 0
                                    ? '#f57f17'
                                    : '#212121',
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Belum ada data bahan barcode.
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ════════════════════════════════════════
           TAB GUDANG GARMEN
      ════════════════════════════════════════ -->
      <v-window-item value="gudang">
        <!-- ── Row baru: Pipeline SPK → Produksi ── -->
        <v-row dense class="mt-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--blue">
                <IconTrendingUp :size="14" :stroke-width="1.7" class="mr-1" />
                Pipeline SPK → Produksi
                <span class="panel-header-sub ml-1"
                  >(dateline {{ pipelineFilter.startDate }} s.d
                  {{ pipelineFilter.endDate }})</span
                >
              </div>
              <div class="panel-body pa-3">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="primary"
                  height="2"
                />
                <template v-else-if="pipelineData.TotalMasuk">
                  <div class="funnel-wrap">
                    <div
                      v-for="(stage, i) in pipelineStages"
                      :key="stage.label"
                      class="funnel-row"
                    >
                      <span class="funnel-label">{{ stage.label }}</span>
                      <div class="funnel-bar-track">
                        <div
                          class="funnel-bar-fill"
                          :style="{
                            width: pipelinePct(stage.value) + '%',
                            background: stage.color,
                          }"
                        />
                      </div>
                      <span class="funnel-val" :style="{ color: stage.color }">
                        {{ stage.value }}
                      </span>
                      <span class="funnel-pct"
                        >{{ pipelinePct(stage.value) }}%</span
                      >
                    </div>
                  </div>
                </template>
                <div v-else class="text-center text-grey py-3 text-caption">
                  Tidak ada SPK dengan dateline pada periode ini.
                </div>
              </div>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mt-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--green">
                <IconTrendingUp :size="14" :stroke-width="1.7" class="mr-1" />
                Pipeline Penyelesaian SPK
                <span class="panel-header-sub ml-1"
                  >(SPK Aktif → STBJ → Kirim → Full Invoice)</span
                >
              </div>
              <div class="panel-body pa-3">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="primary"
                  height="2"
                />
                <template v-else-if="pipelinePenyelesaianSpk.TotalAktif">
                  <div class="funnel-wrap">
                    <div
                      v-for="stage in pipelinePenyelesaianStages"
                      :key="stage.label"
                      class="funnel-row"
                    >
                      <span class="funnel-label">{{ stage.label }}</span>
                      <div class="funnel-bar-track">
                        <div
                          class="funnel-bar-fill"
                          :style="{
                            width: pipelinePenyelesaianPct(stage.value) + '%',
                            background: stage.color,
                          }"
                        />
                      </div>
                      <span class="funnel-val" :style="{ color: stage.color }">
                        {{ stage.value }}
                      </span>
                      <span class="funnel-pct"
                        >{{ pipelinePenyelesaianPct(stage.value) }}%</span
                      >
                    </div>
                  </div>
                </template>
                <div v-else class="text-center text-grey py-3 text-caption">
                  Tidak ada SPK aktif pada periode ini.
                </div>
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
                  background: #ffebee;
                  color: #c62828;
                  border-bottom: 1px solid #ffcdd2;
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
                  style="background: #c62828"
                >
                  {{ bahanKurangSummary.total }} SPK
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="red"
                  height="2"
                />
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
                              color: #c62828;
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Semua kebutuhan bahan produksi tercukupi 🎉
                </div>
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
                SPK Belum Ada MKB
                <span v-if="spkBelumMkbCountVal" class="badge-count ml-auto">
                  {{ spkBelumMkbCountVal }}
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="warning"
                  height="2"
                />
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Semua SPK bulan ini sudah ada MKB 🎉
                </div>
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
                  <v-progress-linear
                    v-if="isLoadingDashboard"
                    indeterminate
                    color="teal"
                    height="2"
                  />
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
                        <span class="po-bpb-val" style="color: #c62828">{{
                          poBpbSummary.Open
                        }}</span>
                        <span class="po-bpb-lbl">OPEN</span>
                      </div>
                      <div class="po-bpb-divider" />
                      <div class="po-bpb-stat">
                        <span class="po-bpb-val" style="color: #0277bd">{{
                          poBpbSummary.OnProses
                        }}</span>
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
                        <span class="leg-dot" style="background: #c62828" />OPEN
                        <span
                          class="leg-dot ml-2"
                          style="background: #0277bd"
                        />ON PROSES
                        <span
                          class="leg-dot ml-2"
                          style="background: #43a047"
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
                  <v-progress-linear
                    v-if="isLoadingDashboard"
                    indeterminate
                    color="teal"
                    height="2"
                  />
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
                        <span class="po-bpb-val" style="color: #c62828">{{
                          poJasaVsBpjData.Belum
                        }}</span>
                        <span class="po-bpb-lbl">BELUM</span>
                      </div>
                      <div class="po-bpb-divider" />
                      <div class="po-bpb-stat">
                        <span class="po-bpb-val" style="color: #0277bd">{{
                          poJasaVsBpjData.Proses
                        }}</span>
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
                          style="background: #c62828"
                        />BELUM
                        <span
                          class="leg-dot ml-2"
                          style="background: #0277bd"
                        />PROSES
                        <span
                          class="leg-dot ml-2"
                          style="background: #43a047"
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
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="warning"
                  height="2"
                />
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
                  <div v-else class="text-center text-grey py-3 text-caption">
                    Semua SPK bulan ini sudah ada STBJ 🎉
                  </div>
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
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="teal"
                  height="2"
                />
                <template v-else>
                  <div
                    class="aging-wrap"
                    style="grid-template-columns: repeat(3, 1fr)"
                  >
                    <div
                      class="aging-chip"
                      style="background: #ffebee; color: #c62828"
                    >
                      <span class="aging-count">{{
                        spkVsSjSummary.BelumKirim
                      }}</span>
                      <span class="aging-label">Belum Kirim</span>
                    </div>
                    <div
                      class="aging-chip"
                      style="background: #fff8e1; color: #f57f17"
                    >
                      <span class="aging-count">{{
                        spkVsSjSummary.SebagianKirim
                      }}</span>
                      <span class="aging-label">Sebagian</span>
                    </div>
                    <div
                      class="aging-chip"
                      style="background: #e8f5e9; color: #2e7d32"
                    >
                      <span class="aging-count">{{
                        spkVsSjSummary.LunasKirim
                      }}</span>
                      <span class="aging-label">Lunas Kirim</span>
                    </div>
                  </div>

                  <div
                    style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0"
                  >
                    <div class="d-flex justify-space-between mb-1">
                      <span style="font-size: 10px; color: #9e9e9e"
                        >Total qty terkirim</span
                      >
                      <span
                        style="
                          font-size: 10px;
                          font-weight: 700;
                          color: #00695c;
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
                          background: '#00897b',
                        }"
                      />
                    </div>
                  </div>

                  <div
                    style="
                      border-top: 1px solid #f0f0f0;
                      padding: 5px 12px 0;
                      font-size: 10px;
                      color: #9e9e9e;
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
                            color: s.QtyKirim === 0 ? '#c62828' : '#f57f17',
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
                    Semua SPK sudah lunas kirim 🎉
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
                  background: #f3e5f5;
                  color: #6a1b9a;
                  border-bottom: 1px solid #e1bee7;
                "
              >
                <IconGauge :size="14" :stroke-width="1.7" class="mr-1" />
                Outstanding PO Mitra
                <span class="panel-header-sub ml-1">(Jasa Jahit)</span>
                <span
                  v-if="outstandingPoMitraSummary.totalMitra"
                  class="badge-count ml-auto"
                  style="background: #6a1b9a"
                >
                  {{ outstandingPoMitraSummary.totalMitra }} mitra
                </span>
              </div>
              <div class="panel-body">
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="purple"
                  height="2"
                />
                <template
                  v-else-if="
                    outstandingPoMitraList.length || isLoadingMoreOutstanding
                  "
                >
                  <div
                    style="
                      padding: 6px 12px;
                      border-bottom: 1px solid #f0f0f0;
                      font-size: 11px;
                      color: #6a1b9a;
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
                            color: #6a1b9a;
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Tidak ada outstanding PO mitra jasa jahit bulan ini 🎉
                </div>
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="6">
            <div class="manksi-panel content-panel fill-height">
              <div
                class="panel-header"
                style="
                  background: #fff3e0;
                  color: #e65100;
                  border-bottom: 1px solid #ffe0b2;
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
                <v-progress-linear
                  v-if="isLoadingDashboard"
                  indeterminate
                  color="orange"
                  height="2"
                />
                <template v-else-if="efisiensiBabaranSummary.totalSpk">
                  <div class="pen-summary-bar">
                    <div class="pen-stat">
                      <span class="pen-stat-val text-primary">{{
                        efisiensiBabaranSummary.totalSpk
                      }}</span>
                      <span class="pen-stat-lbl">Total SPK</span>
                    </div>
                    <div class="pen-stat">
                      <span class="pen-stat-val" style="color: #e65100">{{
                        efisiensiBabaranSummary.jmlDeviasi
                      }}</span>
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
                            color: #c62828;
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Belum ada data babaran bulan ini.
                </div>
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
              <div class="sum-value" style="color: #0277bd">
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
                <v-progress-linear
                  v-if="isLoadingBarangJadi"
                  indeterminate
                  color="primary"
                  height="2"
                />
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
                          :title="item.Nama"
                          style="width: 160px"
                        >
                          {{ item.Nama }}
                        </div>
                        <div class="gb-bar-wrap">
                          <span class="pen-cus" style="flex: 1">
                            {{ item.Gudang }} · {{ item.Customer || "-" }}
                          </span>
                          <span
                            style="
                              font-size: 13px;
                              font-weight: 700;
                              color: #1565c0;
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
                          color: #9e9e9e;
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Belum ada data stok barang jadi.
                </div>
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
                <v-progress-linear
                  v-if="isLoadingBarangJadi"
                  indeterminate
                  color="teal"
                  height="2"
                />
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
                                ? '#c62828'
                                : '#00695c',
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
                <div v-else class="text-center text-grey py-3 text-caption">
                  Belum ada mutasi barang jadi bulan ini.
                </div>
              </div>
            </div>
          </v-col>
        </v-row>
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
  </v-container>
</template>

<style scoped>
/* ── Panel ── */
.manksi-panel {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}
.header-panel {
  padding: 10px 14px;
  border-left: 4px solid #1867c0;
}
.content-panel {
  display: flex;
  flex-direction: column;
}
.panel-header {
  padding: 6px 12px;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  font-size: 12px;
}
.panel-header--warning {
  background: #fffde7;
  color: #f57f17;
  border-bottom: 1px solid #fff9c4;
}
.panel-header--blue {
  background: #e3f2fd;
  color: #1565c0;
  border-bottom: 1px solid #bbdefb;
}
.panel-header--teal {
  background: #e0f2f1;
  color: #00695c;
  border-bottom: 1px solid #b2dfdb;
}
.panel-header--orange {
  background: #fff3e0;
  color: #e65100;
  border-bottom: 1px solid #ffe0b2;
}
.panel-header--green {
  background: #e8f5e9;
  color: #2e7d32;
  border-bottom: 1px solid #c8e6c9;
}
.panel-header-sub {
  font-size: 10px;
  color: #9e9e9e;
  font-weight: 400;
}

.badge-count {
  background: #f57f17;
  color: white;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  line-height: 1.4;
}
.pct-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 10px;
  line-height: 1.4;
}
.pct-good {
  background: #e8f5e9;
  color: #2e7d32;
}
.pct-mid {
  background: #fff8e1;
  color: #f57f17;
}
.pct-low {
  background: #ffebee;
  color: #c62828;
}

.panel-body {
  flex-grow: 1;
  overflow: hidden;
}

/* ── Summary Cards ── */
.sum-card {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 8px 12px;
  text-align: center;
}
.sum-label {
  font-size: 10px;
  color: #757575;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
.sum-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.2;
}

/* ── Shortcut Cards (Overview) ── */
.shortcut-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background 0.15s;
}
.shortcut-card:hover {
  background: #f5f5f5;
}
.shortcut-title {
  font-size: 12px;
  font-weight: 700;
  color: #212121;
}
.shortcut-sub {
  font-size: 10px;
  color: #9e9e9e;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Penawaran ── */
.pen-summary-bar {
  display: flex;
  border-bottom: 1px solid #f0f0f0;
  padding: 6px 0;
}
.pen-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  border-right: 1px solid #f0f0f0;
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
  font-size: 9px;
  color: #9e9e9e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.pen-list {
  max-height: 320px;
  overflow-y: auto;
}
.pen-item {
  padding: 5px 12px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
}
.pen-item.umur-danger {
  background: #fff5f5;
}
.pen-item.umur-warn {
  background: #fffde7;
}
.pen-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pen-nomor {
  font-family: monospace;
  font-weight: 700;
  color: #1565c0;
  font-size: 11px;
}
.pen-divisi {
  font-size: 10px;
  color: #9e9e9e;
}
.pen-age {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}
.pen-age.umur-danger {
  background: #ffebee;
  color: #c62828;
}
.pen-age.umur-warn {
  background: #fff8e1;
  color: #f57f17;
}
.pen-age.umur-ok {
  background: #e8f5e9;
  color: #2e7d32;
}
.pen-cus {
  color: #424242;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
}
.pen-ket {
  font-size: 10px;
  color: #9e9e9e;
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
  color: #9e9e9e;
  font-style: italic;
}
.pen-end {
  font-size: 10px;
  color: #bdbdbd;
}

/* ── Realisasi ── */
.real-total-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}
.real-total-lbl {
  font-size: 10px;
  color: #9e9e9e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.real-total-val {
  font-size: 14px;
  font-weight: 700;
  color: #1565c0;
}
.real-total-close {
  font-size: 11px;
  color: #2e7d32;
  font-weight: 600;
  margin-left: auto;
}
.real-list {
  max-height: 280px;
  overflow-y: auto;
}
.real-row {
  padding: 6px 12px;
  border-bottom: 1px solid #f5f5f5;
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
  color: #1565c0;
}
.real-nominal {
  font-size: 10px;
  color: #757575;
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
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}
.real-seg {
  height: 100%;
  transition: width 0.3s;
}
.real-seg--close {
  background: #43a047;
}
.real-seg--batal {
  background: #e53935;
}
.real-seg--open {
  background: #90caf9;
}
.real-pct {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  min-width: 28px;
  text-align: right;
}
.real-detail {
  display: flex;
  gap: 8px;
  font-size: 10px;
}
.rd-close {
  color: #2e7d32;
}
.rd-batal {
  color: #c62828;
}
.rd-open {
  color: #1565c0;
}
.real-legend {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  font-size: 10px;
  color: #757575;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}
.leg-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 3px;
}
.leg-close {
  background: #43a047;
  margin-left: 8px;
}
.leg-batal {
  background: #e53935;
  margin-left: 8px;
}
.leg-open {
  background: #90caf9;
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
  border-bottom: 1px solid #f5f5f5;
  border-right: 1px solid #f5f5f5;
  font-size: 11px;
  transition: background 0.1s;
}
.map-item:hover {
  background: #fff8e1 !important;
}
.map-item.map-danger {
  background: #fff5f5;
}
.map-item.map-warn {
  background: #fffde7;
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
  color: #1565c0;
  font-size: 11px;
}
.map-cus {
  color: #424242;
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
  border-bottom: 1px solid #f5f5f5;
}
.knj-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.knj-sales {
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
}
.knj-stats {
  display: flex;
  align-items: center;
  gap: 5px;
}
.knj-badge {
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
}
.knj-badge.done {
  background: #e8f5e9;
  color: #2e7d32;
}
.knj-badge.failed {
  background: #ffebee;
  color: #c62828;
}
.knj-badge.unplan {
  background: #e3f2fd;
  color: #1565c0;
}
.knj-total {
  font-size: 9px;
  color: #9e9e9e;
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
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
}
.knj-seg {
  height: 100%;
  transition: width 0.3s;
}
.knj-done {
  background: #43a047;
}
.knj-unplan {
  background: #90caf9;
}
.knj-failed {
  background: #e53935;
}
.knj-pct {
  font-size: 10px;
  font-weight: 700;
  color: #2e7d32;
  min-width: 28px;
  text-align: right;
}
.knj-nominal-badge {
  font-size: 9px;
  font-weight: 700;
  background: #ede7f6;
  color: #4527a0;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}
.knj-nominal-badge--mh {
  background: #f3e5f5;
  color: #6a1b9a;
}
.knj-detail-btn {
  font-size: 9px;
  font-weight: 700;
  color: #2e7d32;
  background: none;
  border: 1px solid #c8e6c9;
  border-radius: 3px;
  padding: 1px 6px;
  cursor: pointer;
  line-height: 1.4;
}
.knj-detail-btn:hover {
  background: #e8f5e9;
}

/* ── PO BPB ── */
.po-bpb-link {
  font-size: 10px;
  font-weight: 700;
  color: #00695c;
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
  font-size: 9px;
  color: #9e9e9e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.po-bpb-divider {
  width: 1px;
  height: 32px;
  background: #e0e0e0;
  flex-shrink: 0;
}
.po-bpb-bar-wrap {
  flex: 1;
  min-width: 200px;
  padding: 0 16px;
}
.po-bpb-bar {
  height: 10px;
  background: #f0f0f0;
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
  background: #c62828;
}
.seg-onproses {
  background: #0277bd;
}
.seg-close {
  background: #43a047;
}
.po-bpb-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #757575;
}

/* ── Dialog SPK ── */
.spk-dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 88vh;
  overflow: hidden;
}
.spk-header {
  background: linear-gradient(135deg, #c62828 0%, #e53935 100%);
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
  background: #f5f5f5;
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
  color: #424242;
  border-bottom: 2px solid #e0e0e0;
  white-space: nowrap;
  text-align: left;
}
.spk-table th.col-num {
  text-align: right;
}
.spk-table td {
  padding: 6px 10px;
  font-size: 12px;
  color: #212121;
  border-bottom: 1px solid #f0f0f0;
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
.row-overdue td {
  background: #fff5f5;
}
.row-today td {
  background: #fffde7;
}
.spk-table tbody tr:hover td {
  background: #e8f4fd !important;
}
.spk-badge {
  font-family: monospace;
  font-size: 11px;
  font-weight: 600;
  color: #1565c0;
}
.dl-badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #f5f5f5;
  color: #424242;
}
.dl-badge.overdue {
  background: #ffebee;
  color: #c62828;
}
.dl-badge.today {
  background: #fff8e1;
  color: #f57f17;
}
.spk-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #fafafa;
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}
.spk-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #757575;
}
.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.legend-dot.overdue {
  background: #ef9a9a;
}
.legend-dot.today {
  background: #ffe082;
}
.val-danger {
  color: #c62828;
  font-weight: 700;
}
.val-done {
  color: #2e7d32;
}
.val-warn {
  color: #f57f17;
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
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
  background: #fff5f5;
}
.overdue-item:hover {
  background: #ffebee;
}

/* ── Collection Rate ── */
.cr-bar-wrap {
  margin-top: 5px;
}
.cr-bar {
  height: 5px;
  background: #f0f0f0;
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
  font-size: 9px;
  color: #9e9e9e;
}

/* ── Aging Bucket ── */
.aging-wrap {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
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
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.aging-nominal {
  font-size: 9px;
  margin-top: 1px;
}

.aging-chip--a {
  background: #fff8e1;
  color: #f57f17;
}
.aging-chip--a .aging-nominal {
  color: #bf360c;
}

.aging-chip--b {
  background: #fff3e0;
  color: #e65100;
}
.aging-chip--b .aging-nominal {
  color: #bf360c;
}

.aging-chip--c {
  background: #ffebee;
  color: #c62828;
}
.aging-chip--c .aging-nominal {
  color: #b71c1c;
}

.aging-chip--d {
  background: #ffcdd2;
  color: #b71c1c;
}
.aging-chip--d .aging-count {
  font-size: 20px;
}
.aging-chip--d .aging-nominal {
  color: #7f0000;
  font-weight: 700;
}

/* ── Overdue List ── */
.overdue-list {
  max-height: 320px;
  overflow-y: auto;
}
.overdue-item {
  padding: 7px 12px;
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
  border-left: 3px solid transparent;
  transition: background 0.1s;
}
.overdue-item:hover {
  background: #fff8f8;
}
.overdue-low {
  border-left-color: #ffcc02;
  background: #fffde7;
}
.overdue-mid {
  border-left-color: #f57f17;
  background: #fff3e0;
}
.overdue-high {
  border-left-color: #e53935;
  background: #ffebee;
}
.overdue-critical {
  border-left-color: #b71c1c;
  background: #ffcdd2;
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
  color: #616161;
}
.trend-bar-bg {
  flex: 1;
  height: 6px;
  background: #f5f5f5;
  border-radius: 3px;
  overflow: hidden;
}
.trend-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.4s ease;
}
.sum-sub {
  font-size: 9px;
  color: #9e9e9e;
  margin-top: 2px;
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
  border-bottom: 1px solid #f5f5f5;
}
.gb-row:last-child {
  border-bottom: none;
}
.gb-nama {
  width: 130px;
  flex-shrink: 0;
  font-size: 11px;
  color: #424242;
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
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
}
.gb-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.gb-bar-val {
  font-size: 10px;
  color: #616161;
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
  font-size: 11px;
  min-width: 500px;
}
.gb-tbl thead th {
  background: #e0f2f1;
  color: #00695c;
  font-weight: 600;
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid #b2dfdb;
  white-space: nowrap;
}
.gb-tbl tbody td {
  padding: 6px 10px;
  border-bottom: 1px solid #f0f0f0;
}
.gb-tbl tbody tr:last-child td {
  border-bottom: none;
}
.gb-tbl tbody tr:hover td {
  background: #f5f5f5;
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
  background: #e8f5e9;
  color: #2e7d32;
}
.gb-badge--warn {
  background: #fff8e1;
  color: #f57f17;
}
.gb-badge--danger {
  background: #ffebee;
  color: #c62828;
}
.sum-sub {
  font-size: 9px;
  color: #9e9e9e;
  margin-top: 2px;
}
/* ── Realisasi Penawaran ── */
.rp-summary {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
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
  background: #e0e0e0;
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
  color: #9e9e9e;
  margin-left: 2px;
}
.rp-lbl {
  font-size: 9px;
  color: #9e9e9e;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.rp-stack-wrap {
  padding: 10px 12px 6px;
  border-bottom: 1px solid #f0f0f0;
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
  color: #757575;
}
.rp-tren-wrap {
  padding: 8px 12px;
}
.rp-tren-title {
  font-size: 10px;
  font-weight: 600;
  color: #9e9e9e;
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
  color: #616161;
  width: 55px;
  flex-shrink: 0;
  font-weight: 500;
}
.rp-tren-bar-wrap {
  flex: 1;
}
.rp-tren-track {
  height: 10px;
  background: #f0f0f0;
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
  background: #9e9e9e;
  border-left: 2px dashed #9e9e9e;
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
  color: #9e9e9e;
  width: 38px;
  text-align: right;
  flex-shrink: 0;
}

/* ── Tabel realisasi detail ── */
.rp-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  min-width: 700px;
}
.rp-tbl thead th {
  background: #e3f2fd;
  color: #1565c0;
  font-weight: 600;
  padding: 6px 10px;
  text-align: left;
  border-bottom: 1px solid #bbdefb;
  white-space: nowrap;
}
.rp-tbl tbody td {
  padding: 5px 10px;
  border-bottom: 1px solid #f0f0f0;
  color: var(--color-text-primary, #212121);
}
.rp-tbl tbody tr:last-child td {
  border-bottom: none;
}
.rp-tbl tbody tr:hover td {
  background: #f5f5f5;
}
.rp-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}
.rp-badge--fast {
  background: #e8f5e9;
  color: #2e7d32;
}
.rp-badge--mid {
  background: #e3f2fd;
  color: #185fa5;
}
.rp-badge--slow {
  background: #fff8e1;
  color: #854f0b;
}
.rp-badge--vslow {
  background: #ffebee;
  color: #c62828;
}
.rp-badge--none {
  background: #f5f5f5;
  color: #757575;
}

.map-date-inp {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 3px 7px;
  font-size: 11px;
  color: #424242;
  background: white;
  outline: none;
}
.map-date-inp:focus {
  border-color: #1867c0;
}
.map-filter-btn {
  background: #1867c0;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.map-filter-btn:hover {
  background: #1565c0;
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
  border-bottom: 1px solid #f5f5f5;
  font-size: 11px;
}
.aktivitas-item:hover {
  background: #f5f9ff;
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
  color: #1565c0;
  width: 160px;
  flex-shrink: 0;
}
.akt-nama {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #212121;
}
.akt-divisi {
  width: 100px;
  flex-shrink: 0;
  color: #757575;
  font-size: 10px;
}
.akt-jam {
  flex-shrink: 0;
  color: #9e9e9e;
  font-size: 10px;
  font-family: monospace;
}

.empty-hint {
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: #bdbdbd;
}

.aktivitas-item--new {
  background: #e8f5e9 !important;
  animation: highlight-fade 3s ease-out forwards;
}

.funnel-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.funnel-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.funnel-label {
  width: 120px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 600;
  color: #424242;
}
.funnel-bar-track {
  flex: 1;
  height: 14px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}
.funnel-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}
.funnel-val {
  width: 36px;
  text-align: right;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.funnel-pct {
  width: 38px;
  text-align: right;
  font-size: 10px;
  color: #9e9e9e;
  flex-shrink: 0;
}

.bk-row {
  border-bottom: 1px solid #f5f5f5;
}
.bk-bahan-list {
  padding: 2px 12px 6px 34px;
}
.bk-bahan-item {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #757575;
  padding: 1px 0;
}
.bk-bahan-nama {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 70%;
}
.bk-bahan-kurang {
  color: #c62828;
  font-weight: 600;
  white-space: nowrap;
}
.row-minus {
  background: #fff5f5;
}
.gj-filter-sel {
  font-size: 10px;
  border: 1px solid #bbdefb;
  border-radius: 3px;
  padding: 2px 6px;
  background: white;
  color: #1565c0;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}

@keyframes highlight-fade {
  0% {
    background: #c8e6c9;
  }
  100% {
    background: transparent;
  }
}
</style>
