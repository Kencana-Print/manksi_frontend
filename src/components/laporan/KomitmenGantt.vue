<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { IconChevronRight, IconChevronDown } from "@tabler/icons-vue";

const props = withDefaults(
  defineProps<{
    periode: any[];
    detail: any[];
    startDate: string;
    endDate: string;
    includeBerjalan?: boolean;
    printMode?: boolean; // lebar kolom hari menyesuaikan A4 landscape, tanpa scroll
    initialExpand?: boolean; // buka semua KK saat data masuk
    loading?: boolean;
    search?: string; // kata kunci: no SO/MAP, nama, no KK, tipe, jenis, cabang
  }>(),
  {
    includeBerjalan: false,
    printMode: false,
    initialExpand: false,
    loading: false,
    search: "",
  },
);

// ── Tanggal ──
const MS_DAY = 86400000;
const MONTHS = [
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
const pad2 = (n: number) => String(n).padStart(2, "0");
const todayYmd = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
})();
const toUtc = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number) => {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
};
const diffDays = (a: string, b: string) =>
  Math.round((toUtc(b) - toUtc(a)) / MS_DAY);
const fmtDate = (val: string) => {
  if (!val) return "";
  const [y, m, d] = val.split("-");
  return `${d}/${m}/${y}`;
};
const fmtShort = (val: string) => {
  if (!val) return "";
  const [, m, d] = val.split("-");
  return `${d}/${m}`;
};
const fmtNum = (v: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(v) || 0,
  );
const fmtPct = (v: number) =>
  `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Number(v) || 0)}%`;

const detailByPeriode = computed(() => {
  const m: Record<string, any[]> = {};
  for (const d of props.detail) (m[d.Periode] ||= []).push(d);
  return m;
});

// ── Pencarian ──
const terms = computed(() =>
  (props.search || "").toLowerCase().split(/\s+/).filter(Boolean),
);
const searchActive = computed(() => terms.value.length > 0);
const cocok = (d: any) => {
  const h =
    `${d.Nomor} ${d.Nama} ${d.Periode} ${d.Tipe} ${d.Jenis} ${d.Cab}`.toLowerCase();
  return terms.value.every((t) => h.includes(t));
};

// ── Timeline ──
const timeline = computed(() => {
  let min = props.startDate;
  let max = props.endDate;
  for (const p of props.periode) {
    if (p.Tgl1 < min) min = p.Tgl1;
    if (p.Tgl2 > max) max = p.Tgl2;
  }
  const n = Math.max(diffDays(min, max) + 1, 1);
  const days = Array.from({ length: n }, (_, i) => {
    const ms = toUtc(min) + i * MS_DAY;
    const d = new Date(ms);
    return {
      ymd: fromUtc(ms),
      day: d.getUTCDate(),
      dow: d.getUTCDay(),
      month: d.getUTCMonth(),
      year: d.getUTCFullYear(),
    };
  });
  const months: { label: string; span: number }[] = [];
  for (const d of days) {
    const label = `${MONTHS[d.month]} ${d.year}`;
    const last = months[months.length - 1];
    if (last && last.label === label) last.span++;
    else months.push({ label, span: 1 });
  }
  return { min, max, n, days, months };
});

const PRINT_TRACK_W = 760; // px, muat A4 landscape

// Lebar wadah dipantau supaya kolom hari melebar memenuhi halaman
const scrollEl = ref<HTMLElement | null>(null);
const wrapW = ref(0);
let ro: ResizeObserver | null = null;
onMounted(() => {
  if (!scrollEl.value) return;
  wrapW.value = scrollEl.value.clientWidth;
  ro = new ResizeObserver(() => {
    if (scrollEl.value) wrapW.value = scrollEl.value.clientWidth;
  });
  ro.observe(scrollEl.value);
});
onBeforeUnmount(() => ro?.disconnect());

// ── Lebar kolom label (bisa di-drag) ──
const LAB_KEY = "kkGanttLabW";
const LAB_DEFAULT = 300;
const LAB_MIN = 200;
const LAB_MAX = 700;

const loadLabW = () => {
  try {
    const v = Number(localStorage.getItem(LAB_KEY));
    return v >= LAB_MIN && v <= LAB_MAX ? v : LAB_DEFAULT;
  } catch {
    return LAB_DEFAULT;
  }
};
const labw = ref(props.printMode ? 230 : loadLabW());

let dragStartX = 0;
let dragStartW = 0;
const onResizeMove = (e: PointerEvent) => {
  // sisakan minimal 120px untuk timeline
  const maxW = Math.min(LAB_MAX, Math.max(LAB_MIN, wrapW.value - 120));
  const w = dragStartW + (e.clientX - dragStartX);
  labw.value = Math.min(Math.max(w, LAB_MIN), maxW);
};
const stopResize = () => {
  window.removeEventListener("pointermove", onResizeMove);
  window.removeEventListener("pointerup", stopResize);
  document.body.style.userSelect = "";
  document.body.style.cursor = "";
};
const onResizeEnd = () => {
  stopResize();
  try {
    localStorage.setItem(LAB_KEY, String(labw.value));
  } catch {
    /* abaikan */
  }
};
const startResize = (e: PointerEvent) => {
  dragStartX = e.clientX;
  dragStartW = labw.value;
  document.body.style.userSelect = "none";
  document.body.style.cursor = "col-resize";
  window.addEventListener("pointermove", onResizeMove);
  window.addEventListener("pointerup", onResizeEnd);
};
onBeforeUnmount(stopResize);
const dayw = computed(() => {
  if (props.printMode)
    return Math.max(Math.floor(PRINT_TRACK_W / timeline.value.n), 12);
  const avail = wrapW.value - labw.value - 2;
  return Math.max(Math.floor(avail / timeline.value.n), 34);
});
const gridVars = computed(() => ({
  "--dayw": `${dayw.value}px`,
  "--labw": `${labw.value}px`,
}));

const trackStyle = computed(() => ({
  width: `calc(${timeline.value.n} * var(--dayw))`,
}));
const todayIdx = computed(() => {
  const i = diffDays(timeline.value.min, todayYmd);
  return i >= 0 && i < timeline.value.n ? i : -1;
});
const todayStyle = computed(() => ({
  left: `calc((${todayIdx.value} + 0.5) * var(--dayw))`,
}));
const barStyle = (tgl1: string, tgl2: string) => {
  const s = diffDays(timeline.value.min, tgl1);
  const e = diffDays(timeline.value.min, tgl2);
  return {
    left: `calc(${s} * var(--dayw) + 2px)`,
    width: `calc(${e - s + 1} * var(--dayw) - 4px)`,
  };
};
const markerIdx = (tgl: string | null) => {
  if (!tgl) return -1;
  const i = diffDays(timeline.value.min, tgl);
  return i >= 0 && i < timeline.value.n ? i : -1;
};
const markerStyle = (tgl: string) => ({
  left: `calc((${markerIdx(tgl)} + 0.5) * var(--dayw))`,
});
// Label bar item pindah ke kanan kalau diamond jatuh di dekat tepi kiri bar
const labelRight = (d: any) => {
  if (!d.TglTercapai) return false;
  const off = (diffDays(d.Tgl1, d.TglTercapai) + 0.5) * dayw.value;
  return off >= 0 && off < 100;
};

// ── Warna ──
const pctClass = (v: number) =>
  v >= 90 ? "c-hijau" : v >= 70 ? "c-oranye" : "c-merah";
const kkClass = (p: any) =>
  !p.Selesai && p.Persen < 100 ? "c-biru" : pctClass(p.Persen);
const itemClass = (s: string) =>
  s === "TERCAPAI"
    ? "c-hijau"
    : s === "SEBAGIAN"
      ? "c-oranye"
      : s === "GAGAL"
        ? "c-merah"
        : "c-biru";

// ── State buka/tutup ──
const collapsedCab = ref<Set<string>>(new Set());
const expandedKk = ref<Set<string>>(new Set());

const toggleCab = (cab: string) => {
  const s = new Set(collapsedCab.value);
  s.has(cab) ? s.delete(cab) : s.add(cab);
  collapsedCab.value = s;
};
const toggleKk = (nomor: string) => {
  const s = new Set(expandedKk.value);
  s.has(nomor) ? s.delete(nomor) : s.add(nomor);
  expandedKk.value = s;
};
const expandAll = () => {
  collapsedCab.value = new Set();
  expandedKk.value = new Set(props.periode.map((p) => p.Periode));
};
const collapseAll = () => {
  expandedKk.value = new Set();
  collapsedCab.value = new Set(props.periode.map((p) => p.Cab));
};

watch(
  () => props.periode,
  () => {
    if (props.initialExpand) expandAll();
  },
  { immediate: true },
);

// Saat mencari, buka otomatis KK yang punya baris cocok
watch(
  () => [props.search, props.detail],
  () => {
    if (!searchActive.value) return;
    const s = new Set<string>();
    for (const d of props.detail) if (cocok(d)) s.add(d.Periode);
    expandedKk.value = s;
    collapsedCab.value = new Set();
  },
);

defineExpose({ expandAll, collapseAll });

// ── Baris ──
const rows = computed(() => {
  const out: any[] = [];
  const byCab = new Map<string, any[]>();
  for (const p of props.periode) {
    if (!byCab.has(p.Cab)) byCab.set(p.Cab, []);
    byCab.get(p.Cab)!.push(p);
  }
  for (const cab of [...byCab.keys()].sort()) {
    const list = byCab.get(cab)!.sort((a, b) => (a.Tgl1 < b.Tgl1 ? -1 : 1));

    // Ringkasan cabang selalu dari data lengkap, bukan hasil pencarian
    const hitung = list.filter((p) => p.Selesai || props.includeBerjalan);
    const rencana = hitung.reduce((s, p) => s + p.Rencana, 0);
    const tercapai = hitung.reduce((s, p) => s + p.Tercapai, 0);

    const tampil = searchActive.value
      ? list.filter((p) => (detailByPeriode.value[p.Periode] || []).some(cocok))
      : list;
    if (searchActive.value && !tampil.length) continue;

    out.push({
      kind: "cab",
      key: `c|${cab}`,
      cab,
      rencana,
      tercapai,
      persen: rencana > 0 ? Math.round((tercapai / rencana) * 1000) / 10 : 0,
      jml: list.length,
      jmlTampil: tampil.length,
      adaHitung: hitung.length > 0,
    });
    if (collapsedCab.value.has(cab)) continue;
    for (const p of tampil) {
      out.push({ kind: "kk", key: p.Periode, p });
      if (expandedKk.value.has(p.Periode)) {
        const items = detailByPeriode.value[p.Periode] || [];
        const tampilItems = searchActive.value ? items.filter(cocok) : items;
        tampilItems.forEach((d, i) => {
          out.push({ kind: "item", key: `i|${p.Periode}|${i}|${d.Id}`, d, p });
        });
      }
    }
  }
  return out;
});
</script>

<template>
  <div>
    <div
      ref="scrollEl"
      class="g-scroll"
      :class="{ 'print-mode': printMode, 'is-loading': loading }"
    >
      <div v-if="loading && !rows.length" class="g-empty">Memuat data...</div>
      <div v-else-if="!rows.length" class="g-empty">
        {{
          searchActive
            ? `Tidak ada yang cocok dengan "${search}".`
            : "Tidak ada komitmen kirim pada periode ini."
        }}
      </div>

      <div v-else class="g-grid" :style="gridVars">
        <!-- Header -->
        <div class="g-row g-head">
          <div class="g-label g-head-label">
            Cabang / Komitmen Kirim
            <span
              v-if="!printMode"
              class="g-resizer"
              title="Geser untuk mengubah lebar kolom"
              @pointerdown.prevent="startResize"
            />
          </div>
          <div class="g-track" :style="trackStyle">
            <div class="g-months">
              <div
                v-for="m in timeline.months"
                :key="m.label"
                class="g-month"
                :style="{ width: `calc(${m.span} * var(--dayw))` }"
              >
                {{ m.label }}
              </div>
            </div>
            <div class="g-days">
              <div
                v-for="d in timeline.days"
                :key="d.ymd"
                class="g-day"
                :class="{
                  'is-sun': d.dow === 0,
                  'is-today': d.ymd === todayYmd,
                }"
              >
                {{ d.day }}
              </div>
            </div>
          </div>
        </div>

        <template v-for="r in rows" :key="r.key">
          <!-- Cabang -->
          <div
            v-if="r.kind === 'cab'"
            class="g-row g-cab"
            @click="toggleCab(r.cab)"
          >
            <div class="g-label">
              <component
                :is="
                  collapsedCab.has(r.cab) ? IconChevronRight : IconChevronDown
                "
                :size="14"
                :stroke-width="2.2"
              />
              <span class="cab-name">{{ r.cab }}</span>
              <span
                class="cab-sum"
                :class="r.adaHitung ? pctClass(r.persen) : ''"
              >
                {{ r.adaHitung ? fmtPct(r.persen) : "-" }}
              </span>
              <span class="cab-sub">
                {{ fmtNum(r.tercapai) }}/{{ fmtNum(r.rencana) }} pcs ·
                {{ searchActive ? `${r.jmlTampil} dari ${r.jml}` : r.jml }} KK
              </span>
            </div>
            <div class="g-track" :style="trackStyle">
              <div v-if="todayIdx >= 0" class="g-today" :style="todayStyle" />
            </div>
          </div>

          <!-- Komitmen Kirim -->
          <div
            v-else-if="r.kind === 'kk'"
            class="g-row g-kk"
            @click="toggleKk(r.p.Periode)"
          >
            <div class="g-label g-indent1">
              <component
                :is="
                  expandedKk.has(r.p.Periode)
                    ? IconChevronDown
                    : IconChevronRight
                "
                :size="13"
                :stroke-width="2.2"
              />
              <span class="kk-no">{{ r.p.Periode }}</span>
              <span class="kk-sub"
                >{{ fmtShort(r.p.Tgl1) }}–{{ fmtShort(r.p.Tgl2) }}</span
              >
            </div>
            <div class="g-track" :style="trackStyle">
              <div v-if="todayIdx >= 0" class="g-today" :style="todayStyle" />
              <div
                class="g-bar"
                :class="kkClass(r.p)"
                :style="barStyle(r.p.Tgl1, r.p.Tgl2)"
                :title="`${r.p.Periode} (${r.p.Cab})\n${fmtDate(r.p.Tgl1)} – ${fmtDate(r.p.Tgl2)}\nTercapai ${fmtNum(r.p.Tercapai)} dari ${fmtNum(r.p.Rencana)} pcs (${fmtPct(r.p.Persen)})`"
              >
                {{ fmtPct(r.p.Persen) }} · {{ fmtNum(r.p.Tercapai) }}/{{
                  fmtNum(r.p.Rencana)
                }}
              </div>
            </div>
          </div>

          <!-- Item SO / MAP -->
          <div v-else class="g-row g-item">
            <div
              class="g-label g-indent2"
              :title="`${r.d.Nomor} — ${r.d.Nama}`"
            >
              <span class="it-tipe">{{ r.d.Tipe }}</span>
              <span class="it-no">{{ r.d.Nomor }}</span>
              <span class="it-nama">{{ r.d.Nama }}</span>
            </div>
            <div class="g-track" :style="trackStyle">
              <div v-if="todayIdx >= 0" class="g-today" :style="todayStyle" />
              <div
                class="g-bar g-bar-item"
                :class="[
                  itemClass(r.d.Status),
                  { 'lbl-right': labelRight(r.d) },
                ]"
                :style="barStyle(r.d.Tgl1, r.d.Tgl2)"
                :title="`${r.d.Nomor}\nRencana ${fmtNum(r.d.Rencana)} · Tercapai ${fmtNum(r.d.Tercapai)} (${fmtPct(r.d.Persen)})\nStatus ${r.d.Status}`"
              >
                {{ fmtNum(r.d.Tercapai) }}/{{ fmtNum(r.d.Rencana) }}
              </div>
              <div
                v-if="markerIdx(r.d.TglTercapai) >= 0"
                class="g-marker"
                :class="r.d.TglTercapai <= r.d.Tgl2 ? 'c-hijau' : 'c-merah'"
                :style="markerStyle(r.d.TglTercapai)"
                :title="`Target tercapai ${fmtDate(r.d.TglTercapai)}${r.d.TglTercapai > r.d.Tgl2 ? ' (terlambat)' : ''}`"
              />
            </div>
          </div>
        </template>
      </div>
    </div>

    <div class="legend">
      <span><i class="sw c-hijau" /> ≥ 90%</span>
      <span><i class="sw c-oranye" /> 70–89%</span>
      <span><i class="sw c-merah" /> &lt; 70%</span>
      <span><i class="sw c-biru" /> Berjalan</span>
      <span><i class="dm c-hijau" /> Target tercapai tepat waktu</span>
      <span><i class="dm c-merah" /> Target tercapai terlambat</span>
    </div>
  </div>
</template>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  font-size: 10.5px;
  color: #555;
}
.legend span {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sw {
  width: 14px;
  height: 8px;
  border-radius: 3px;
  display: inline-block;
}
.dm {
  width: 9px;
  height: 9px;
  transform: rotate(45deg);
  display: inline-block;
}

.c-hijau {
  color: #2e7d32;
}
.c-oranye {
  color: #ef6c00;
}
.c-merah {
  color: #c62828;
}
.sw.c-hijau,
.dm.c-hijau,
.g-bar.c-hijau,
.g-marker.c-hijau {
  background: #43a047;
  color: #fff;
}
.sw.c-oranye,
.g-bar.c-oranye {
  background: #fb8c00;
  color: #fff;
}
.sw.c-merah,
.dm.c-merah,
.g-bar.c-merah,
.g-marker.c-merah {
  background: #e53935;
  color: #fff;
}
.sw.c-biru,
.g-bar.c-biru {
  background: #1e88e5;
  color: #fff;
}

.g-scroll {
  overflow: auto;
  max-height: calc(100vh - 230px);
  border: 1px solid #d0d7de;
  border-radius: 6px;
  background: #fff;
}
.g-scroll.print-mode {
  max-height: none;
  overflow: visible;
  border: none;
}
.g-scroll.is-loading {
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.15s;
}
.g-empty {
  padding: 40px;
  text-align: center;
  color: #888;
}
.g-grid {
  display: inline-block;
  min-width: 100%;
}
.g-row {
  display: flex;
  border-bottom: 1px solid #eef0f2;
  break-inside: avoid;
}
.g-label {
  position: sticky;
  left: 0;
  z-index: 3;
  flex: 0 0 var(--labw);
  width: var(--labw);
  background: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  height: 30px;
  border-right: 1px solid #d0d7de;
  overflow: hidden;
  white-space: nowrap;
}
.print-mode .g-label {
  position: static;
}
.g-track {
  position: relative;
  flex: 0 0 auto;
  height: 30px;
  background-image: linear-gradient(to right, #eef0f2 1px, transparent 1px);
  background-size: var(--dayw) 100%;
}

.g-head {
  position: sticky;
  top: 0;
  z-index: 5;
}
.print-mode .g-head {
  position: static;
}
.g-head .g-label,
.g-head .g-track {
  height: auto;
  background: #0d3b66;
  color: #fff;
}
.g-head-label {
  font-weight: 700;
  align-items: flex-end;
  padding-bottom: 6px;
  font-size: 12px;
}
.g-resizer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  touch-action: none;
}
.g-resizer:hover,
.g-resizer:active {
  background: rgba(255, 255, 255, 0.35);
}
.g-head .g-track {
  background-image: none;
}
.g-months {
  display: flex;
}
.g-month {
  text-align: center;
  font-weight: 700;
  font-size: 11px;
  padding: 3px 0;
  border-right: 1px solid rgba(255, 255, 255, 0.25);
  overflow: hidden;
}
.g-days {
  display: flex;
}
.g-day {
  width: var(--dayw);
  flex: 0 0 var(--dayw);
  text-align: center;
  font-size: 10.5px;
  padding: 3px 0;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.g-day.is-sun {
  background: rgba(255, 255, 255, 0.12);
  color: #ffb3b3;
}
.g-day.is-today {
  background: #ffca28;
  color: #000;
  font-weight: 800;
}

.g-cab {
  cursor: pointer;
}
.g-cab .g-label,
.g-cab .g-track {
  background-color: #eaf1f8;
}
.g-cab .g-label {
  font-weight: 700;
}
.cab-name {
  font-size: 13px;
  color: #0d3b66;
}
.cab-sum {
  font-weight: 800;
}
.cab-sub {
  font-size: 10.5px;
  font-weight: 400;
  color: #555;
}

.g-kk {
  cursor: pointer;
}
.g-kk:hover .g-label,
.g-kk:hover .g-track {
  background-color: #f6f9fc;
}
.g-indent1 {
  padding-left: 22px;
}
.kk-no {
  font-weight: 700;
  color: #1565c0;
}
.kk-sub {
  font-size: 10.5px;
  color: #777;
}

.g-item .g-label,
.g-item .g-track {
  height: 26px;
}
.g-item .g-label {
  font-size: 11px;
}
.g-indent2 {
  padding-left: 40px;
}
.it-tipe {
  font-size: 9px;
  font-weight: 700;
  background: #eceff1;
  color: #455a64;
  padding: 1px 4px;
  border-radius: 3px;
}
.it-no {
  font-weight: 600;
  color: #555;
}
.it-nama {
  color: #777;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.it-tipe,
.it-no {
  flex-shrink: 0;
}

.g-bar {
  position: absolute;
  top: 5px;
  height: 20px;
  border-radius: 10px;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 20px;
  padding: 0 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  box-sizing: border-box;
}
.g-bar-item {
  top: 4px;
  height: 18px;
  line-height: 18px;
  opacity: 0.85;
}
.g-bar.lbl-right {
  text-align: right;
}
.g-marker {
  position: absolute;
  top: 8px;
  width: 11px;
  height: 11px;
  margin-left: -5px;
  transform: rotate(45deg);
  border: 1.5px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.25);
  z-index: 2;
}
.g-today {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: #ffa000;
  opacity: 0.7;
  z-index: 1;
}

@media print {
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
</style>
