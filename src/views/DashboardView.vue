<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
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
  IconAlertTriangle,
  IconWalk,
  IconLayoutDashboard,
  IconCoin,
  IconChevronRight,
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
}

const authStore = useAuthStore();
const router = useRouter();
const isSpkDialogVisible = ref(false);
const activeTab = ref("overview");

watch(activeTab, async (tab) => {
  await nextTick();
  if (tab === "marketing") {
    setupPenObserver();
    setupMapObserver();
  }
  if (tab === "finance") {
    setupOverdueObserver();
  }
});

const fmtNum = (val: number) =>
  new Intl.NumberFormat("id-ID").format(Math.ceil(val || 0));

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
const kunjunganRows = ref<any[]>([]);
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
});

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

// ── Load Dashboard ──
const loadDashboard = async () => {
  isLoadingDashboard.value = true;
  penawaranBelumSpk.value = [];
  penOffset.value = 0;
  penHasMore.value = true;
  penawaranBelumMap.value = [];
  mapOffset.value = 0;
  mapHasMore.value = true;

  try {
    const [spkSumRes] = await Promise.allSettled([
      dashboardService.getSpkSummary(),
    ]);
    if (spkSumRes.status === "fulfilled")
      spkSummary.value = spkSumRes.value.data.data;

    if (showPoBpb.value) {
      const [poBpbRes] = await Promise.allSettled([
        dashboardService.getPoBahanBpbSummary(),
      ]);
      if (poBpbRes.status === "fulfilled")
        poBpbSummary.value = poBpbRes.value.data.data;
    }

    if (showPenawaran.value) {
      const [sumRes, realisasiRes, mapSumRes, kunjunganRes] =
        await Promise.allSettled([
          dashboardService.getPenawaranSummary(),
          dashboardService.getRealisasiSummary(),
          dashboardService.getPenawaranMapSummary(),
          dashboardService.getKunjunganSalesSummary(),
        ]);
      if (sumRes.status === "fulfilled")
        penSummary.value = sumRes.value.data.data;
      if (realisasiRes.status === "fulfilled")
        realisasiRows.value = realisasiRes.value.data.data;
      if (mapSumRes.status === "fulfilled")
        mapSummary.value = mapSumRes.value.data.data;
      if (kunjunganRes.status === "fulfilled")
        kunjunganRows.value = kunjunganRes.value.data.data || [];

      await Promise.allSettled([loadMorePenawaran(), loadMoreMap()]);
    }

    if (showPiutang.value) {
      // Reset overdue infinite scroll
      overdueList.value = [];
      overdueOffset.value = 0;
      overdueHasMore.value = true;

      // Load summary + top5 saja (bukan overdue — itu lazy)
      const [piutangRes] = await Promise.allSettled([
        dashboardService.getPiutangDashboard(),
      ]);
      if (piutangRes.status === "fulfilled" && piutangRes.value?.data?.data) {
        // Ambil summary + top5, overdue load terpisah via infinite scroll
        piutangData.value.summary = piutangRes.value.data.data.summary;
        piutangData.value.top5 = piutangRes.value.data.data.top5;
        piutangData.value.overdue = []; // kosongkan, ganti pakai overdueList
      }

      // Load batch pertama overdue
      await loadMoreOverdue();
    }
  } finally {
    isLoadingDashboard.value = false;
  }
};

onMounted(async () => {
  // Auto-select tab berdasarkan bagian user
  if (!showPenawaran.value && !showPiutang.value && showPoBpb.value) {
    activeTab.value = "gudang";
  } else if (!showPenawaran.value && showPiutang.value && !showPoBpb.value) {
    activeTab.value = "finance";
  } else if (showPenawaran.value && !showPiutang.value && !showPoBpb.value) {
    activeTab.value = "marketing";
  }

  if (
    authStore.spkUrgent?.length > 0 &&
    !sessionStorage.getItem("hasSeenSpk")
  ) {
    isSpkDialogVisible.value = true;
  }

  await loadDashboard();

  // Setup observer untuk tab yang aktif saat ini
  await nextTick();
  if (activeTab.value === "marketing") {
    setupPenObserver();
    setupMapObserver();
  }
  if (activeTab.value === "finance") {
    setupOverdueObserver();
  }
});

onUnmounted(() => {
  penScrollObserver?.disconnect();
  mapScrollObserver?.disconnect();
  overdueScrollObserver?.disconnect();
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
                {{ isLoadingDashboard ? "—" : spkSummary.TotalAktif }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Terlambat</div>
              <div class="sum-value text-error">
                {{ isLoadingDashboard ? "—" : spkSummary.Terlambat }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Deadline Hari Ini</div>
              <div class="sum-value text-warning">
                {{ isLoadingDashboard ? "—" : spkSummary.DeadlineHariIni }}
              </div>
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Segera Deadline (≤3hr)</div>
              <div class="sum-value" style="color: #e65100">
                {{ isLoadingDashboard ? "—" : spkSummary.SegeredDeadline }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Shortcut cards ke tab lain -->
        <v-row dense>
          <v-col v-if="showPenawaran" cols="12" sm="4">
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
          <v-col v-if="showPiutang" cols="12" sm="4">
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
          <v-col v-if="showPoBpb" cols="12" sm="4">
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
                    {{ poBpbSummary.Open }} PO Open ·
                    {{ poBpbSummary.OnProses }} On Proses
                  </span>
                </div>
              </div>
              <IconChevronRight :size="16" color="#9e9e9e" />
            </div>
          </v-col>
        </v-row>
      </v-window-item>

      <!-- ════════════════════════════════════════
           TAB MARKETING
      ════════════════════════════════════════ -->
      <v-window-item value="marketing">
        <!-- Row 1: Penawaran Belum SPK + Realisasi -->
        <v-row dense class="mb-2">
          <!-- Penawaran Belum SPK -->
          <v-col cols="12" md="4">
            <div class="manksi-panel content-panel fill-height">
              <div class="panel-header panel-header--warning">
                <IconFileAlert :size="14" :stroke-width="1.7" class="mr-1" />
                Penawaran Belum SPK
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
                      <span class="pen-stat-lbl">Belum SPK</span>
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

          <!-- Realisasi Penawaran per Divisi -->
          <v-col cols="12" md="8">
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
                            :title="`Close: ${shortNum(Number(row.Close))}`"
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
                            :title="`Batal: ${shortNum(Number(row.Batal))}`"
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
                            :title="`Open: ${shortNum(Number(row.Nominal) - Number(row.Close) - Number(row.Batal))}`"
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
                        <span v-if="Number(row.Batal) > 0" class="rd-batal">
                          ✕ {{ shortNum(Number(row.Batal)) }}
                        </span>
                        <span class="rd-open">
                          ○
                          {{
                            shortNum(
                              Number(row.Nominal) -
                                Number(row.Close) -
                                Number(row.Batal),
                            )
                          }}
                        </span>
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

        <!-- Row 2: Penawaran Belum MAP -->
        <v-row dense class="mb-2">
          <v-col cols="12">
            <div class="manksi-panel content-panel">
              <div class="panel-header panel-header--orange">
                <IconAlertTriangle
                  :size="14"
                  :stroke-width="1.7"
                  class="mr-1"
                />
                Penawaran Belum Ada MAP
                <span class="panel-header-sub ml-1">(semua data)</span>
                <span
                  v-if="mapSummary.BelumMAPAdaClose"
                  class="badge-count ml-2"
                  style="background: #e65100"
                >
                  {{ mapSummary.BelumMAPAdaClose }} perlu perhatian
                </span>
                <span
                  class="ml-auto d-flex align-center"
                  style="gap: 12px; font-size: 11px"
                >
                  <span
                    >Total: <b>{{ mapSummary.TotalPenawaran }}</b></span
                  >
                  <span style="color: #2e7d32"
                    >Ada MAP: <b>{{ mapSummary.SudahMAP }}</b></span
                  >
                  <span style="color: #c62828"
                    >Belum MAP: <b>{{ mapSummary.BelumMAP }}</b></span
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

                    <!-- Sentinel lazy load MAP -->
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
                        {{ penawaranBelumMap.length }} penawaran ditampilkan
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
        </v-row>

        <!-- Row 3: Kunjungan Sales -->
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
                            title="Lihat detail kunjungan sales ini"
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
                            :title="`Done: ${row.Done}`"
                          />
                          <div
                            class="knj-seg knj-unplan"
                            :style="{
                              width: row.Total
                                ? (row.Unplan / row.Total) * 100 + '%'
                                : '0%',
                            }"
                            :title="`Unplan: ${row.Unplan}`"
                          />
                          <div
                            class="knj-seg knj-failed"
                            :style="{
                              width: row.Total
                                ? (row.Failed / row.Total) * 100 + '%'
                                : '0%',
                            }"
                            :title="`Failed: ${row.Failed}`"
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
      </v-window-item>

      <!-- ════════════════════════════════════════
           TAB FINANCE / PIUTANG
      ════════════════════════════════════════ -->
      <v-window-item value="finance">
        <!-- Metric cards piutang -->
        <v-row dense class="mb-3">
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Total Outstanding</div>
              <div class="sum-value text-error">
                <span v-if="isLoadingDashboard">—</span>
                <span v-else>{{
                  shortNum(piutangData.summary.TotalOutstanding)
                }}</span>
              </div>
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
            </div>
          </v-col>
          <v-col cols="6" sm="3">
            <div class="sum-card">
              <div class="sum-label">Terima Bulan Ini</div>
              <div class="sum-value text-success">
                <span v-if="isLoadingDashboard">—</span>
                <span v-else>{{
                  shortNum(piutangData.summary.TerimaBulanIni)
                }}</span>
              </div>
            </div>
          </v-col>

          <!-- Collection Rate — card baru -->
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
                  <span class="cr-sub">piutang lunas / total historis</span>
                </div>
              </template>
            </div>
          </v-col>
        </v-row>

        <!-- Invoice Overdue + Top 5 -->
        <v-row dense>
          <!-- Panel Invoice Overdue -->
          <v-col cols="12" md="6">
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

                  <!-- List overdue dengan infinite scroll -->
                  <template v-if="overdueList.length || isLoadingMoreOverdue">
                    <div class="overdue-list">
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

          <!-- Panel Top 5 Piutang -->
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
                <IconChartBar :size="14" :stroke-width="1.7" class="mr-1" />
                Top 5 Piutang Terbesar
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
        </v-row>
      </v-window-item>

      <!-- ════════════════════════════════════════
           TAB GUDANG GARMEN
      ════════════════════════════════════════ -->
      <v-window-item value="gudang">
        <v-row dense>
          <v-col cols="12">
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
                  @click="router.push('/laporan/gudang-garmen/po-bahan-vs-bpb')"
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
                    <div class="po-bpb-bar-wrap">
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
                  </div>
                </template>
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
  display: flex;
  flex-wrap: wrap;
  max-height: 200px;
  overflow-y: auto;
}
.map-item {
  width: 25%;
  padding: 6px 12px;
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
</style>
