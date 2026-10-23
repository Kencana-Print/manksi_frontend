<script setup lang="ts">
import { computed, watch } from "vue";
import {
  bangunGrid,
  fmtAngka,
  hitungRowspan,
  toExportTable,
  type ExportTable,
  type ViewMutasi,
} from "@/utils/mutasiPivot";

const props = withDefaults(
  defineProps<{
    data: Record<string, unknown>[];
    view: ViewMutasi;
    rincianSize?: boolean;
    hanyaAdaBs?: boolean;
    heat?: boolean;
  }>(),
  { rincianSize: false, hanyaAdaBs: false, heat: true },
);

const emit = defineEmits<{
  (e: "pivot-changed", table: ExportTable | null): void;
}>();

const grid = computed(() =>
  bangunGrid(props.view, props.data, {
    rincianSize: props.rincianSize,
    hanyaAdaBs: props.hanyaAdaBs,
  }),
);

// rowspan[level][baris] → >0 = render <th rowspan>, 0 = dilewati
const spans = computed(() =>
  grid.value.judulLabel.map((_, lv) => hitungRowspan(grid.value.baris, lv)),
);
const adaGrupBaru = (r: number): boolean =>
  r > 0 && (spans.value[0]?.[r] ?? 0) > 0;

// ── Posisi sticky kolom label ──
const offsetLabel = computed(() => {
  let acc = 0;
  return grid.value.lebarLabel.map((w) => {
    const o = acc;
    acc += w;
    return o;
  });
});
const labelStyle = (i: number): Record<string, string> => {
  const w = grid.value.lebarLabel[i] ?? 120;
  return {
    left: `${offsetLabel.value[i] ?? 0}px`,
    minWidth: `${w}px`,
    maxWidth: `${w}px`,
  };
};

// ── Intensitas warna (satu hue, maks 30% supaya teks tetap terbaca) ──
const skalaMax = computed<number[]>(() => {
  const g = grid.value;
  const perKolom = g.kolom.map((k, i) => {
    if (!k.heat) return 0;
    let m = 0;
    for (const b of g.baris) {
      const v = b.nilai[i];
      if (v != null && v > m) m = v;
    }
    return m;
  });
  if (g.skalaHeat === "global") {
    const m = Math.max(0, ...perKolom);
    return perKolom.map(() => m);
  }
  return perKolom;
});
const heatStyle = (
  v: number | null,
  i: number,
): Record<string, string> | undefined => {
  if (!props.heat || v === null || v <= 0) return undefined;
  if (!grid.value.kolom[i]?.heat) return undefined;
  const m = skalaMax.value[i] ?? 0;
  if (m <= 0) return undefined;
  const pct = Math.round((v / m) * 30);
  return {
    background: `color-mix(in srgb, var(--mp-heat) ${pct}%, transparent)`,
  };
};

const tampil = (v: number | null): string => (v === null ? "–" : fmtAngka(v));
const tooltip = (label: string[], kolom: string, v: number | null): string =>
  `${label.join(" › ")} · ${kolom}: ${tampil(v)}`;

// Beri tahu halaman (untuk Grafik) setiap kali tabel berubah.
watch(grid, (g) => emit("pivot-changed", toExportTable(g, false)), {
  immediate: true,
});

defineExpose({
  exportPivotToExcel: async (): Promise<ExportTable | null> => {
    const t = toExportTable(grid.value, true);
    return t.bodyRows.length ? t : null;
  },
  getRowFieldCount: (): number => grid.value.judulLabel.length,
});
</script>

<template>
  <div class="mp-wrap">
    <div v-if="!grid.baris.length" class="mp-empty">
      Tidak ada data untuk tampilan ini.
    </div>
    <table v-else class="mp-table">
      <thead>
        <tr>
          <th
            v-for="(j, i) in grid.judulLabel"
            :key="'h' + i"
            class="mp-head mp-lbl"
            :style="labelStyle(i)"
          >
            {{ j }}
          </th>
          <th
            v-for="k in grid.kolom"
            :key="k.key"
            class="mp-head mp-num"
            :title="k.tip"
          >
            <div>{{ k.judul }}</div>
            <div v-if="k.sub" class="mp-sub">{{ k.sub }}</div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(b, r) in grid.baris"
          :key="r"
          :class="{ 'mp-grup': adaGrupBaru(r) }"
        >
          <template v-for="(l, c) in b.label" :key="c">
            <th
              v-if="(spans[c]?.[r] ?? 0) > 0"
              :rowspan="spans[c]?.[r]"
              class="mp-lbl"
              :style="labelStyle(c)"
            >
              {{ l }}
            </th>
          </template>
          <td
            v-for="(v, i) in b.nilai"
            :key="i"
            class="mp-num"
            :class="{ 'mp-nol': v === null || v === 0 }"
            :style="heatStyle(v, i)"
            :title="tooltip(b.label, grid.kolom[i]?.judul ?? '', v)"
          >
            {{ tampil(v) }}
          </td>
        </tr>
      </tbody>
      <tfoot v-if="grid.total">
        <tr>
          <th class="mp-lbl mp-total" :colspan="grid.judulLabel.length">
            Total
          </th>
          <td
            v-for="(v, i) in grid.total"
            :key="i"
            class="mp-num mp-total"
            :class="{ 'mp-nol': v === null }"
          >
            {{ tampil(v) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
.mp-wrap {
  --mp-heat: #1565c0;
  --mp-line: #e3e8ee;
  height: 100%;
  min-height: 0;
  overflow: auto;
  background: #fff;
}
.mp-empty {
  padding: 24px;
  color: #757575;
  font-size: 13px;
}
.mp-table {
  border-collapse: separate;
  border-spacing: 0;
  font-size: 12px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  min-width: 100%;
}
.mp-table th,
.mp-table td {
  padding: 3px 8px;
  border-bottom: 1px solid var(--mp-line);
  background-clip: padding-box;
}
.mp-head {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #eef3f9;
  color: #0d47a1;
  font-weight: 700;
  text-align: right;
  vertical-align: bottom;
  white-space: nowrap;
}
.mp-sub {
  font-weight: 400;
  color: #5c6b7a;
}
.mp-lbl {
  position: sticky;
  z-index: 1;
  background: #fff;
  text-align: left;
  vertical-align: top;
  font-weight: 600;
  border-right: 1px solid var(--mp-line);
  overflow-wrap: anywhere;
}
.mp-head.mp-lbl {
  z-index: 3;
  background: #eef3f9;
  vertical-align: bottom;
}
.mp-num {
  text-align: right;
  white-space: nowrap;
}
.mp-nol {
  color: #9aa5b1;
}
.mp-table tbody tr:hover td {
  box-shadow: inset 0 0 0 999px rgba(21, 101, 192, 0.06);
}
.mp-grup > th,
.mp-grup > td {
  border-top: 2px solid #b8c4d0;
}
.mp-total {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #eef3f9;
  font-weight: 700;
  border-top: 2px solid #b8c4d0;
}
</style>
