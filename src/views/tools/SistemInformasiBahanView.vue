<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import PageLayout from "@/components/PageLayout.vue";
import { informasiBahanService as svc } from "@/services/tools/informasiBahanService";
import { Chart, registerables } from "chart.js";
import {
  IconDatabaseSearch,
  IconSearch,
  IconAlertTriangle,
  IconPackageOff,
  IconCoins,
  IconClockPause,
  IconChevronDown,
  IconChevronUp,
  IconHistory,
  IconArrowDownRight,
  IconArrowUpRight,
  IconX,
  IconAdjustmentsHorizontal,
  IconLayoutDashboard,
  IconTrophy,
} from "@tabler/icons-vue";

Chart.register(...registerables);

interface BahanRow {
  Kode: string;
  Nama: string;
  Satuan: string;
  Gramasi: string;
  HargaBeli: number;
  Stok: number;
  NilaiStok: number;
  LastPermintaan: string | null;
  LastRealisasi: string | null;
  PernahBergerak: boolean;
  LastPergerakan: string | null;
  BulanTanpaGerak: number | null;
}

interface KartuRow {
  Jenis: "PERMINTAAN" | "REALISASI";
  Nomor: string;
  Tanggal: string;
  Jumlah: number;
  SpkNomor: string | null;
  Gudang: string;
}

// ── Tab ────────────────────────────────────────────────────
const activeTab = ref<"dashboard" | "search">("dashboard");

// ── Shared formatters ────────────────────────────────────────
const fmtNum = (v: number) => new Intl.NumberFormat("id-ID").format(v || 0);
const fmtRp = (v: number) =>
  "Rp " + new Intl.NumberFormat("id-ID").format(v || 0);
const fmtDate = (v: string | null) => {
  if (!v) return "-";
  const s = String(v).substring(0, 10);
  const [y, m, d] = s.split("-");
  if (!y || !m || !d) return v;
  return `${d}/${m}/${y}`;
};
const fmtDurasi = (bulan: number | null, pernahGerak: boolean) => {
  if (!pernahGerak) return "Tidak pernah bergerak";
  if (bulan === null) return "-";
  if (bulan < 12) return `${bulan} bulan`;
  const tahun = Math.floor(bulan / 12);
  const sisaBulan = bulan % 12;
  return sisaBulan > 0 ? `${tahun} thn ${sisaBulan} bln` : `${tahun} tahun`;
};
const severityClass = (bulan: number | null, pernahGerak: boolean) => {
  if (!pernahGerak) return "sev-critical";
  if (bulan === null) return "";
  if (bulan >= 36) return "sev-critical";
  if (bulan >= 24) return "sev-high";
  if (bulan >= 12) return "sev-medium";
  return "sev-low";
};

// ── TAB 1: Dashboard ───────────────────────────────────────
const dashTahun = ref(3);
const dashTopN = ref(10);
const dashLoading = ref(false);
const dashRows = ref<BahanRow[]>([]);
const topNOptions = [10, 20, 50];
const tahunOptions = [1, 2, 3, 4, 5];

const dashTopRows = computed(() =>
  [...dashRows.value]
    .sort((a, b) => b.NilaiStok - a.NilaiStok)
    .slice(0, dashTopN.value),
);

const dashSummary = computed(() => {
  const total = dashRows.value.length;
  const nilai = dashRows.value.reduce((s, r) => s + r.NilaiStok, 0);
  const takGerak = dashRows.value.filter((r) => !r.PernahBergerak).length;
  return { total, nilai, takGerak };
});

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart | null = null;

const renderChart = () => {
  if (!chartCanvas.value) return;
  const data = dashTopRows.value;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  chartInstance = new Chart(chartCanvas.value, {
    type: "bar",
    data: {
      labels: data.map((r) =>
        r.Nama.length > 28 ? r.Nama.substring(0, 28) + "…" : r.Nama,
      ),
      datasets: [
        {
          label: "Nilai Stok (Rp)",
          data: data.map((r) => r.NilaiStok),
          backgroundColor: data.map((r) => {
            const c = severityClass(r.BulanTanpaGerak, r.PernahBergerak);
            if (c === "sev-critical") return "#e53935";
            if (c === "sev-high") return "#fb8c00";
            if (c === "sev-medium") return "#fdd835";
            return "#42a5f5";
          }),
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              "Rp " + new Intl.NumberFormat("id-ID").format(ctx.parsed.x ?? 0),
            afterLabel: (ctx) => {
              const row = data[ctx.dataIndex];
              return `Stok: ${fmtNum(row.Stok)} ${row.Satuan} — ${fmtDurasi(row.BulanTanpaGerak, row.PernahBergerak)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            callback: (val) =>
              "Rp " +
              new Intl.NumberFormat("id-ID", { notation: "compact" }).format(
                Number(val),
              ),
          },
        },
      },
    },
  });

  // ⬅ BARU — paksa resize setelah browser selesai layout, menutupi
  // kasus canvas dibuat saat container masih 0px (first mount / tab
  // baru pertama kali ditampilkan)
  requestAnimationFrame(() => {
    chartInstance?.resize();
  });
};

const fetchDashboard = async () => {
  dashLoading.value = true;
  try {
    const res = await svc.getSlowMoving("", dashTahun.value);
    dashRows.value = res.data.data;
  } catch {
    dashRows.value = [];
  } finally {
    dashLoading.value = false;
  }

  await nextTick();
  await new Promise((r) => requestAnimationFrame(r));
  renderChart();
};

watch([dashTahun, dashTopN], fetchDashboard);
watch(activeTab, (val) => {
  if (val === "dashboard") {
    nextTick(() => {
      if (chartInstance) {
        chartInstance.resize(); // ⬅ CHANGED — resize instance lama, bukan render ulang dari nol
      } else {
        renderChart();
      }
    });
  }
});

// ── TAB 2: Search & Detail ───────────────────────────────────
const mode = ref<"slow-moving" | "search">("slow-moving");
const keyword = ref("");
const minTahun = ref(3);
const isLoading = ref(false);
const rows = ref<BahanRow[]>([]);
const expandedKode = ref<string | null>(null);
const kartuRows = ref<KartuRow[]>([]);
const isLoadingKartu = ref(false);

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const fetchData = async () => {
  isLoading.value = true;
  try {
    if (mode.value === "slow-moving") {
      const res = await svc.getSlowMoving(keyword.value, minTahun.value);
      rows.value = res.data.data;
    } else {
      const res = await svc.search(keyword.value, true);
      rows.value = res.data.data;
    }
  } catch {
    rows.value = [];
  } finally {
    isLoading.value = false;
  }
};

const onKeywordInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fetchData, 350);
};

watch([mode, minTahun], fetchData);

const toggleExpand = async (kode: string) => {
  if (expandedKode.value === kode) {
    expandedKode.value = null;
    return;
  }
  expandedKode.value = kode;
  isLoadingKartu.value = true;
  kartuRows.value = [];
  try {
    const res = await svc.getKartuPergerakan(kode);
    kartuRows.value = res.data.data;
  } catch {
    kartuRows.value = [];
  } finally {
    isLoadingKartu.value = false;
  }
};

const totalItem = computed(() => rows.value.length);
const totalNilai = computed(() =>
  rows.value.reduce((s, r) => s + (r.NilaiStok || 0), 0),
);
const totalTakPernahGerak = computed(
  () => rows.value.filter((r) => !r.PernahBergerak).length,
);
const rataRataBulan = computed(() => {
  const withGerak = rows.value.filter((r) => r.BulanTanpaGerak !== null);
  if (!withGerak.length) return 0;
  return Math.round(
    withGerak.reduce((s, r) => s + (r.BulanTanpaGerak || 0), 0) /
      withGerak.length,
  );
});

const resetFilter = () => {
  keyword.value = "";
  minTahun.value = 3;
  mode.value = "slow-moving";
  fetchData();
};

onMounted(() => {
  fetchDashboard();
  fetchData();
});
</script>

<template>
  <PageLayout
    title="Sistem Informasi Bahan"
    menu-id="1322"
    :icon="IconDatabaseSearch"
  >
    <div class="sib-wrap">
      <!-- ── Tab Nav ── -->
      <div class="sib-tab-nav">
        <button
          class="sib-tab-btn"
          :class="{ active: activeTab === 'dashboard' }"
          @click="activeTab = 'dashboard'"
        >
          <IconLayoutDashboard :size="15" /> Dashboard
        </button>
        <button
          class="sib-tab-btn"
          :class="{ active: activeTab === 'search' }"
          @click="activeTab = 'search'"
        >
          <IconSearch :size="15" /> Pencarian & Detail
        </button>
      </div>

      <!-- ══════════════ TAB 1: DASHBOARD ══════════════ -->
      <div v-show="activeTab === 'dashboard'" class="sib-dash">
        <div class="sib-dash-controls">
          <div class="sib-dash-title">
            <IconTrophy :size="16" color="#e65100" />
            <span>Top Bahan Slow Moving berdasarkan Nilai Stok</span>
          </div>
          <div class="sib-dash-filters">
            <div class="sib-tahun-filter">
              <IconAdjustmentsHorizontal :size="14" />
              <span>Minimal diam</span>
              <select v-model.number="dashTahun" class="sib-tahun-select">
                <option v-for="t in tahunOptions" :key="t" :value="t">
                  {{ t }} tahun
                </option>
              </select>
            </div>
            <div class="sib-tahun-filter">
              <span>Tampilkan</span>
              <select v-model.number="dashTopN" class="sib-tahun-select">
                <option v-for="n in topNOptions" :key="n" :value="n">
                  Top {{ n }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="sib-summary-grid">
          <div class="sib-card">
            <div class="sib-card-icon sib-icon-blue">
              <IconPackageOff :size="18" />
            </div>
            <div class="sib-card-body">
              <div class="sib-card-val">{{ fmtNum(dashSummary.total) }}</div>
              <div class="sib-card-lbl">Total Item Slow Moving</div>
            </div>
          </div>
          <div class="sib-card">
            <div class="sib-card-icon sib-icon-orange">
              <IconCoins :size="18" />
            </div>
            <div class="sib-card-body">
              <div class="sib-card-val">{{ fmtRp(dashSummary.nilai) }}</div>
              <div class="sib-card-lbl">Total Nilai Nganggur</div>
            </div>
          </div>
          <div class="sib-card">
            <div class="sib-card-icon sib-icon-red">
              <IconAlertTriangle :size="18" />
            </div>
            <div class="sib-card-body">
              <div class="sib-card-val">{{ fmtNum(dashSummary.takGerak) }}</div>
              <div class="sib-card-lbl">Tidak Pernah Bergerak</div>
            </div>
          </div>
        </div>

        <div class="sib-chart-box">
          <div v-if="dashLoading" class="sib-loading">
            <v-progress-circular indeterminate color="primary" size="26" />
            <span>Memuat chart...</span>
          </div>
          <div v-else-if="!dashRows.length" class="sib-empty">
            <IconPackageOff :size="36" color="#bdbdbd" />
            <div class="sib-empty-text">
              Tidak ada bahan slow moving pada periode ini
            </div>
          </div>
          <canvas
            v-else
            ref="chartCanvas"
            :style="{
              height: `${Math.max(280, dashTopRows.length * 32)}px`,
              width: '100%',
            }"
          ></canvas>
        </div>

        <div v-if="dashTopRows.length" class="sib-dash-list">
          <div class="sib-dash-list-scroll">
            <table class="sib-table">
              <thead>
                <tr>
                  <th style="width: 40px" class="tc">#</th>
                  <th style="width: 100px">Kode</th>
                  <th style="min-width: 200px">Nama Bahan</th>
                  <th style="width: 90px" class="tr">Stok</th>
                  <th style="width: 130px" class="tr">Nilai Stok</th>
                  <th style="width: 160px">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(r, i) in dashTopRows" :key="r.Kode">
                  <td class="tc muted">{{ i + 1 }}</td>
                  <td class="mono">{{ r.Kode }}</td>
                  <td class="font-weight-medium">{{ r.Nama }}</td>
                  <td class="tr">{{ fmtNum(r.Stok) }} {{ r.Satuan }}</td>
                  <td class="tr font-weight-bold">{{ fmtRp(r.NilaiStok) }}</td>
                  <td>
                    <span
                      class="sib-badge"
                      :class="
                        severityClass(r.BulanTanpaGerak, r.PernahBergerak)
                      "
                    >
                      {{ fmtDurasi(r.BulanTanpaGerak, r.PernahBergerak) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ══════════════ TAB 2: SEARCH & DETAIL ══════════════ -->
      <div v-show="activeTab === 'search'" class="sib-search-layout">
        <!-- Left column -->
        <div class="sib-left-col">
          <div class="sib-search-box">
            <IconSearch :size="15" class="sib-search-icon-sm" />
            <input
              v-model="keyword"
              type="text"
              class="sib-search-input-sm"
              placeholder="Cari nama/kode bahan..."
              @input="onKeywordInput"
            />
            <button
              v-if="keyword"
              class="sib-search-clear-sm"
              @click="
                keyword = '';
                fetchData();
              "
            >
              <IconX :size="12" />
            </button>
          </div>

          <div class="sib-mode-toggle-v">
            <button
              class="sib-mode-btn-v"
              :class="{ active: mode === 'slow-moving' }"
              @click="mode = 'slow-moving'"
            >
              <IconClockPause :size="13" /> Slow Moving
            </button>
            <button
              class="sib-mode-btn-v"
              :class="{ active: mode === 'search' }"
              @click="mode = 'search'"
            >
              <IconSearch :size="13" /> Semua Bahan
            </button>
          </div>

          <div v-if="mode === 'slow-moving'" class="sib-tahun-filter-v">
            <label>Tanpa pergerakan minimal</label>
            <select v-model.number="minTahun" class="sib-tahun-select-v">
              <option v-for="t in tahunOptions" :key="t" :value="t">
                {{ t }} tahun
              </option>
            </select>
          </div>

          <button class="sib-reset-btn-v" @click="resetFilter">
            Reset Filter
          </button>

          <div class="sib-summary-v">
            <div class="sib-card-v">
              <IconPackageOff :size="16" color="#1565c0" />
              <div>
                <div class="sib-card-val-v">{{ fmtNum(totalItem) }}</div>
                <div class="sib-card-lbl-v">Item Ditemukan</div>
              </div>
            </div>
            <div class="sib-card-v">
              <IconCoins :size="16" color="#e65100" />
              <div>
                <div class="sib-card-val-v">{{ fmtRp(totalNilai) }}</div>
                <div class="sib-card-lbl-v">Total Nilai Stok</div>
              </div>
            </div>
            <div class="sib-card-v">
              <IconAlertTriangle :size="16" color="#c62828" />
              <div>
                <div class="sib-card-val-v">
                  {{ fmtNum(totalTakPernahGerak) }}
                </div>
                <div class="sib-card-lbl-v">Tidak Pernah Bergerak</div>
              </div>
            </div>
            <div class="sib-card-v">
              <IconClockPause :size="16" color="#7b1fa2" />
              <div>
                <div class="sib-card-val-v">{{ rataRataBulan }} bln</div>
                <div class="sib-card-lbl-v">Rata-rata Diam</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right column: table -->
        <div class="sib-right-col">
          <div v-if="isLoading" class="sib-loading">
            <v-progress-circular indeterminate color="primary" size="28" />
            <span>Memuat data...</span>
          </div>
          <div v-else-if="!rows.length" class="sib-empty">
            <IconPackageOff :size="40" color="#bdbdbd" />
            <div class="sib-empty-text">
              {{
                keyword
                  ? `Tidak ada bahan cocok dengan "${keyword}"`
                  : "Tidak ada data untuk filter saat ini"
              }}
            </div>
          </div>
          <div v-else class="sib-table-wrap">
            <table class="sib-table">
              <thead>
                <tr>
                  <th style="width: 28px"></th>
                  <th style="width: 100px">Kode</th>
                  <th style="min-width: 200px">Nama Bahan</th>
                  <th style="width: 60px" class="tc">Satuan</th>
                  <th style="width: 90px" class="tr">Stok</th>
                  <th style="width: 130px" class="tr">Nilai Stok</th>
                  <th style="width: 140px">Terakhir Bergerak</th>
                  <th style="width: 160px">Status</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="r in rows" :key="r.Kode">
                  <tr
                    class="sib-row"
                    :class="{ expanded: expandedKode === r.Kode }"
                    @click="toggleExpand(r.Kode)"
                  >
                    <td class="tc">
                      <IconChevronUp
                        v-if="expandedKode === r.Kode"
                        :size="14"
                      />
                      <IconChevronDown v-else :size="14" color="#999" />
                    </td>
                    <td class="mono">{{ r.Kode }}</td>
                    <td class="font-weight-medium">{{ r.Nama }}</td>
                    <td class="tc">{{ r.Satuan }}</td>
                    <td class="tr font-weight-bold">{{ fmtNum(r.Stok) }}</td>
                    <td class="tr">{{ fmtRp(r.NilaiStok) }}</td>
                    <td>{{ fmtDate(r.LastPergerakan) }}</td>
                    <td>
                      <span
                        class="sib-badge"
                        :class="
                          severityClass(r.BulanTanpaGerak, r.PernahBergerak)
                        "
                      >
                        {{ fmtDurasi(r.BulanTanpaGerak, r.PernahBergerak) }}
                      </span>
                    </td>
                  </tr>

                  <tr v-if="expandedKode === r.Kode" class="sib-expand-row">
                    <td colspan="8" class="sib-expand-cell">
                      <div class="sib-kartu-wrap">
                        <div class="sib-kartu-title">
                          <IconHistory :size="14" /> Riwayat Pergerakan —
                          {{ r.Nama }}
                        </div>
                        <div v-if="isLoadingKartu" class="sib-kartu-loading">
                          <v-progress-circular
                            indeterminate
                            size="18"
                            width="2"
                            color="primary"
                          />
                          Memuat riwayat...
                        </div>
                        <div
                          v-else-if="!kartuRows.length"
                          class="sib-kartu-empty"
                        >
                          Belum ada riwayat permintaan maupun realisasi untuk
                          bahan ini.
                        </div>
                        <table v-else class="sib-kartu-table">
                          <thead>
                            <tr>
                              <th style="width: 110px">Jenis</th>
                              <th style="width: 130px">Nomor</th>
                              <th style="width: 100px">Tanggal</th>
                              <th style="width: 90px" class="tr">Jumlah</th>
                              <th style="width: 120px">SPK</th>
                              <th>Gudang</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(k, idx) in kartuRows" :key="idx">
                              <td>
                                <span
                                  class="sib-jenis-chip"
                                  :class="
                                    k.Jenis === 'PERMINTAAN'
                                      ? 'chip-req'
                                      : 'chip-real'
                                  "
                                >
                                  <IconArrowUpRight
                                    v-if="k.Jenis === 'PERMINTAAN'"
                                    :size="11"
                                  />
                                  <IconArrowDownRight v-else :size="11" />
                                  {{
                                    k.Jenis === "PERMINTAAN"
                                      ? "Permintaan"
                                      : "Realisasi"
                                  }}
                                </span>
                              </td>
                              <td class="mono">{{ k.Nomor }}</td>
                              <td>{{ fmtDate(k.Tanggal) }}</td>
                              <td class="tr">{{ fmtNum(k.Jumlah) }}</td>
                              <td class="mono">{{ k.SpkNomor || "-" }}</td>
                              <td>{{ k.Gudang }}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </PageLayout>
</template>

<style scoped>
.sib-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  height: 100%;
  overflow: hidden;
}

/* ── Tab Nav ── */
.sib-tab-nav {
  display: flex;
  gap: 4px;
  background: #e0e0e0;
  border-radius: 6px;
  padding: 4px;
  flex-shrink: 0;
  width: fit-content;
}
.sib-tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  border: none;
  background: transparent;
  color: #555;
  font-size: 12px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
}
.sib-tab-btn.active {
  background: #1565c0;
  color: white;
}

/* ── Dashboard ── */
.sib-dash {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.sib-dash-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 14px;
}
.sib-dash-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #333;
}
.sib-dash-filters {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}
.sib-chart-box {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 14px;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sib-dash-list {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  max-height: 480px;
  display: flex;
  flex-direction: column;
}

/* ── Summary Cards (dashboard, horizontal) ── */
.sib-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
}
.sib-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.sib-card-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.sib-icon-blue {
  background: #e3f2fd;
  color: #1565c0;
}
.sib-icon-orange {
  background: #fff3e0;
  color: #e65100;
}
.sib-icon-red {
  background: #ffebee;
  color: #c62828;
}
.sib-icon-purple {
  background: #f3e5f5;
  color: #7b1fa2;
}
.sib-card-val {
  font-size: 15px;
  font-weight: 700;
  color: #212121;
  line-height: 1.2;
}
.sib-card-lbl {
  font-size: 10.5px;
  color: #757575;
  margin-top: 2px;
}

.sib-tahun-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #555;
}
.sib-tahun-select {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
}

/* ── Search Layout (left-right) ── */
.sib-search-layout {
  display: flex;
  gap: 10px;
  flex: 1;
  min-height: 0;
}
.sib-left-col {
  width: 250px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}
.sib-right-col {
  flex: 1;
  min-width: 0;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sib-search-box {
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #bdbdbd;
  border-radius: 6px;
  padding: 0 8px;
  height: 34px;
}
.sib-search-icon-sm {
  color: #1565c0;
  flex-shrink: 0;
}
.sib-search-input-sm {
  flex: 1;
  border: none;
  outline: none;
  padding: 0 6px;
  font-size: 12px;
}
.sib-search-clear-sm {
  background: #f0f0f0;
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.sib-mode-toggle-v {
  display: flex;
  flex-direction: column;
  gap: 3px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 4px;
}
.sib-mode-btn-v {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border: none;
  background: transparent;
  color: #555;
  font-size: 11.5px;
  font-weight: 600;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
}
.sib-mode-btn-v.active {
  background: #e3f2fd;
  color: #1565c0;
}

.sib-tahun-filter-v {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sib-tahun-filter-v label {
  font-size: 10.5px;
  color: #777;
  font-weight: 600;
}
.sib-tahun-select-v {
  height: 26px;
  border: 1px solid #bdbdbd;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
}

.sib-reset-btn-v {
  background: #f5f5f5;
  border: 1px solid #ccc;
  color: #555;
  font-size: 11.5px;
  font-weight: 600;
  padding: 7px;
  border-radius: 6px;
  cursor: pointer;
}
.sib-reset-btn-v:hover {
  background: #e0e0e0;
}

.sib-summary-v {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sib-card-v {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.sib-card-val-v {
  font-size: 12.5px;
  font-weight: 700;
  color: #212121;
  line-height: 1.2;
}
.sib-card-lbl-v {
  font-size: 10px;
  color: #888;
}

/* ── Table (shared) ── */
.sib-loading,
.sib-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #757575;
  font-size: 12px;
}
.sib-empty-text {
  font-size: 13px;
  font-weight: 600;
  color: #9e9e9e;
}

.sib-table-wrap {
  overflow-y: auto;
  flex: 1;
}
.sib-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.sib-table thead th {
  background: #1565c0;
  color: white;
  padding: 8px 10px;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: left;
}
.sib-row {
  cursor: pointer;
  transition: background 0.1s;
}
.sib-row:hover {
  background: #f5f9ff;
}
.sib-row.expanded {
  background: #e3f2fd;
}
.sib-row td {
  padding: 8px 10px;
  border-bottom: 1px solid #eee;
}
.mono {
  font-family: monospace;
}
.muted {
  color: #9e9e9e;
}
.tc {
  text-align: center;
}
.tr {
  text-align: right;
}

.sib-badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}
.sev-low {
  background: #fff3e0;
  color: #e65100;
}
.sev-medium {
  background: #ffe0b2;
  color: #d84315;
}
.sev-high {
  background: #ffccbc;
  color: #bf360c;
}
.sev-critical {
  background: #ffcdd2;
  color: #b71c1c;
}

/* ── Expand kartu pergerakan ── */
.sib-expand-row td {
  padding: 0;
  border-bottom: 2px solid #90caf9;
}
.sib-expand-cell {
  background: #f8fbff;
}
.sib-kartu-wrap {
  padding: 12px 16px 16px 40px;
}
.sib-kartu-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #1565c0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}
.sib-kartu-loading,
.sib-kartu-empty {
  font-size: 11px;
  color: #9e9e9e;
  padding: 10px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-style: italic;
}
.sib-kartu-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}
.sib-kartu-table th {
  background: #eceff1;
  color: #37474f;
  padding: 5px 8px;
  font-weight: 700;
  text-align: left;
  border-bottom: 1px solid #cfd8dc;
}
.sib-kartu-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #f0f0f0;
}

.sib-jenis-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 8px;
}
.sib-dash-list-scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.chip-req {
  background: #e3f2fd;
  color: #1565c0;
}
.chip-real {
  background: #e8f5e9;
  color: #2e7d32;
}
</style>
