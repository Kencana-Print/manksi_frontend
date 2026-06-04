<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
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
} from "@tabler/icons-vue";

const authStore = useAuthStore();
const router = useRouter();
const isSpkDialogVisible = ref(false);

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
const showPenawaranMap = computed(
  () => bagian.value === "MARKETING" || isSuperViewer.value,
);

const RANGE_DAYS = 90;

const mapSummary = ref({
  TotalPenawaran: 0,
  SudahMAP: 0,
  BelumMAP: 0,
  BelumMAPAdaClose: 0,
});
const penawaranBelumMap = ref<any[]>([]);

// ── State Dashboard ──
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

// ── Infinite scroll state (Penawaran Belum SPK) ──
const PEN_PAGE_SIZE = 20;
const penOffset = ref(0);
const penHasMore = ref(true);
const isLoadingMorePen = ref(false);
const penListEl = ref<HTMLElement | null>(null);
let penScrollObserver: IntersectionObserver | null = null;
const penSentinelEl = ref<HTMLElement | null>(null);

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
  penScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMorePenawaran();
    },
    { threshold: 0.1 },
  );
  if (penSentinelEl.value) penScrollObserver.observe(penSentinelEl.value);
};

// ── Infinite scroll state (Penawaran Belum MAP) ──
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
  mapScrollObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) loadMoreMap();
    },
    { threshold: 0.1 },
  );
  if (mapSentinelEl.value) mapScrollObserver.observe(mapSentinelEl.value);
};

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

      // Load batch pertama keduanya paralel
      await Promise.allSettled([loadMorePenawaran(), loadMoreMap()]);
    }
  } finally {
    isLoadingDashboard.value = false;
  }
};

onMounted(async () => {
  if (
    authStore.spkUrgent &&
    authStore.spkUrgent.length > 0 &&
    !sessionStorage.getItem("hasSeenSpk")
  ) {
    isSpkDialogVisible.value = true;
  }
  await loadDashboard();
  setTimeout(() => {
    setupPenObserver();
    setupMapObserver(); // ← tambah ini
  }, 300);
});

onUnmounted(() => {
  penScrollObserver?.disconnect();
  mapScrollObserver?.disconnect();
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

// ── Penawaran helpers ──
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

// ── Realisasi helpers ──
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

    <!-- ── Row 1: SPK Summary Cards ── -->
    <v-row dense class="mb-2">
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

    <!-- ── Row 2: Panel Penawaran (Marketing + Super Viewer) ── -->
    <v-row v-if="showPenawaran" dense class="mb-2">
      <!-- Penawaran Belum SPK -->
      <v-col cols="12" md="4">
        <div class="manksi-panel content-panel fill-height">
          <div class="panel-header panel-header--warning">
            <IconFileAlert :size="14" :stroke-width="1.7" class="mr-1" />
            Penawaran Belum SPK
            <span v-if="penSummary.BelumSpk" class="badge-count ml-auto">{{
              penSummary.BelumSpk
            }}</span>
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
                ref="penListEl"
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
              <div
                v-else-if="!isLoadingDashboard"
                class="text-center text-grey py-3 text-caption"
              >
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
                <span class="real-total-val">{{ shortNum(totalNominal) }}</span>
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

    <!-- ── Row 2b: Penawaran Belum MAP ── -->
    <v-row v-if="showPenawaran" dense class="mb-2">
      <v-col cols="12">
        <div class="manksi-panel content-panel">
          <div class="panel-header panel-header--orange">
            <IconAlertTriangle :size="14" :stroke-width="1.7" class="mr-1" />
            Penawaran Belum Ada MAP
            <span class="panel-header-sub ml-1">
              ({{ RANGE_DAYS }} hari terakhir · belum ada MAP & belum close)
            </span>
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
            <template v-else-if="penawaranBelumMap.length || isLoadingMoreMap">
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
                  @click="router.push('/laporan/marketing/penawaran-vs-map')"
                  style="cursor: pointer"
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
                      <span class="pen-age" :class="umurClass(p.UmurHari)">
                        {{ p.UmurHari }}h
                      </span>
                    </div>
                  </div>
                  <div class="map-cus">{{ p.NamaCustomer }}</div>
                  <div v-if="p.Keterangan" class="pen-ket">
                    {{ p.Keterangan }}
                  </div>
                </div>

                <!-- Sentinel lazy load -->
                <div
                  ref="mapSentinelEl"
                  style="width: 100%; padding: 6px 12px; text-align: center"
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
    </v-row>

    <!-- ── Row 2c: Kunjungan Sales ── -->
    <!-- ── Row 2c: Kunjungan Sales ── -->
    <v-row v-if="showPenawaran" dense class="mb-2">
      <v-col cols="12">
        <div class="manksi-panel content-panel">
          <div class="panel-header panel-header--green">
            <IconWalk :size="14" :stroke-width="1.7" class="mr-1" />
            Kunjungan Sales
            <span class="panel-header-sub ml-1">(bulan ini)</span>
            <!-- Tombol lihat detail tanpa filter sales (semua) -->
            <button class="po-bpb-link ml-auto" @click="goToKunjunganDetail()">
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
                  <!-- Baris atas: Nama + badge angka + tombol detail -->
                  <div class="knj-meta">
                    <span class="knj-sales">{{ row.Nama_Sales }}</span>
                    <div class="knj-stats">
                      <span class="knj-badge done">✓ {{ row.Done }}</span>
                      <span class="knj-badge failed">✕ {{ row.Failed }}</span>
                      <span class="knj-badge unplan">+ {{ row.Unplan }}</span>
                      <span class="knj-total">{{ row.Total }} total</span>
                      <!-- Nominal badge -->
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
                      <!-- Tombol detail per sales -->
                      <button
                        class="knj-detail-btn"
                        @click="goToKunjunganDetail(row.Nama_Sales)"
                        title="Lihat detail kunjungan sales ini"
                      >
                        Detail →
                      </button>
                    </div>
                  </div>
                  <!-- Progress bar (tidak berubah) -->
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
              <!-- Legend -->
              <div class="real-legend">
                <span class="leg-dot" style="background: #43a047" />Done
                <span class="leg-dot ml-2" style="background: #90caf9" />Unplan
                <span class="leg-dot ml-2" style="background: #e53935" />Failed
                <span class="leg-dot ml-2" style="background: #7c4dff" />📋 =
                Penawaran bulan ini · MH = Minta Harga
              </div>
            </template>
            <div v-else class="text-center text-grey py-3 text-caption">
              Belum ada data kunjungan bulan ini.
            </div>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- ── Row 3: PO Bahan vs BPB (Pembelian / Gudang / PPIC / Super Viewer) ── -->
    <v-row v-if="showPoBpb" dense class="mb-2">
      <v-col cols="12">
        <div class="manksi-panel content-panel">
          <div class="panel-header panel-header--teal">
            <IconTruckDelivery :size="14" :stroke-width="1.7" class="mr-1" />
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
                  @click="router.push('/laporan/gudang-garmen/po-bahan-vs-bpb')"
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
                          ? (poBpbSummary.Open / poBpbSummary.TotalPO) * 100 +
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
                          ? (poBpbSummary.Close / poBpbSummary.TotalPO) * 100 +
                            '%'
                          : '0%',
                      }"
                      :title="`CLOSE: ${poBpbSummary.Close}`"
                    />
                  </div>
                  <div class="po-bpb-legend">
                    <span class="leg-dot" style="background: #c62828" />OPEN
                    <span class="leg-dot ml-2" style="background: #0277bd" />ON
                    PROSES
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

    <!-- ── Dialog SPK Urgent ── -->
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
  max-height: 260px;
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

/* ── PO BPB Panel ── */
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
  gap: 0;
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
.ml-2 {
  margin-left: 8px;
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

.panel-header--orange {
  background: #fff3e0;
  color: #e65100;
  border-bottom: 1px solid #ffe0b2;
}
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
  background: #ffebee;
  color: #c62828;
  padding: 1px 5px;
  border-radius: 3px;
}

.panel-header--green {
  background: #e8f5e9;
  color: #2e7d32;
  border-bottom: 1px solid #c8e6c9;
}
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

/* Badge nominal penawaran/MH per sales */
.knj-nominal-badge {
  font-size: 9px;
  font-weight: 700;
  background: #ede7f6;
  color: #4527a0;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

/* Tombol detail per-sales */
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

.knj-nominal-badge--mh {
  background: #f3e5f5;
  color: #6a1b9a;
}
</style>
