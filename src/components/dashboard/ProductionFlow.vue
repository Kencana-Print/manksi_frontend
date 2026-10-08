<script setup lang="ts">
import { computed } from "vue";

interface FlowStage {
  key: string;
  label: string;
  value: number;
}

const props = defineProps<{ stages: FlowStage[]; compact?: boolean }>();

const total = computed(() => props.stages[0]?.value || 0);

// "tertahan" = sudah sampai tahap ini tetapi belum sampai tahap berikutnya
const rows = computed(() =>
  props.stages.map((s, i) => {
    const next = props.stages[i + 1];
    return {
      ...s,
      pct: total.value ? Math.round((s.value / total.value) * 100) : 0,
      pctLabel:
        total.value &&
        s.value > 0 &&
        Math.round((s.value / total.value) * 100) === 0
          ? "<1"
          : String(total.value ? Math.round((s.value / total.value) * 100) : 0),
      stuck: next ? Math.max(0, s.value - next.value) : 0,
    };
  }),
);

const worstIndex = computed(() => {
  let idx = -1;
  let max = 0;
  rows.value.forEach((r, i) => {
    if (r.stuck > max) {
      max = r.stuck;
      idx = i;
    }
  });
  return idx;
});

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
</script>

<template>
  <ol
    class="pf"
    :class="{ 'pf--compact': compact }"
    aria-label="Alur produksi SPK"
  >
    <li
      v-for="(r, i) in rows"
      :key="r.key"
      class="pf-node"
      :class="{
        'pf-node--worst': i === worstIndex,
        'pf-node--last': i === rows.length - 1,
      }"
      :title="
        i === worstIndex ? 'Paling banyak SPK berhenti di tahap ini' : undefined
      "
    >
      <div class="pf-label">{{ r.label }}</div>
      <div class="pf-value">{{ fmt(r.value) }}</div>
      <div class="pf-track">
        <div class="pf-fill" :style="{ width: r.pct + '%' }" />
      </div>
      <div class="pf-meta">
        {{ i === 0 ? "acuan 100%" : `${r.pctLabel}% dari SPK masuk` }}
      </div>
      <div v-if="r.stuck" class="pf-stuck">{{ fmt(r.stuck) }} belum lanjut</div>
      <span v-if="i === worstIndex" class="pf-tag">Tersendat</span>
    </li>
  </ol>
</template>

<style scoped>
.pf {
  list-style: none;
  margin: 0;
  padding: 14px 8px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(124px, 1fr);
  overflow-x: auto;
}
.pf-node {
  position: relative;
  padding: 8px 14px 10px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-radius: 10px;
}
.pf-node:not(:last-child)::after {
  content: "";
  position: absolute;
  right: -4px;
  top: 34px;
  width: 7px;
  height: 7px;
  border-top: 1.5px solid var(--dsh-ink-3);
  border-right: 1.5px solid var(--dsh-ink-3);
  transform: rotate(45deg);
  opacity: 0.55;
}
.pf-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--dsh-ink-2);
}
.pf-value {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--dsh-ink);
  font-variant-numeric: tabular-nums;
}
.pf-track {
  height: 4px;
  margin-top: 4px;
  border-radius: 2px;
  background: var(--dsh-fill);
  overflow: hidden;
}
.pf-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--dsh-accent);
  transition: width 0.4s var(--dsh-ease, ease);
}
.pf-node--last .pf-fill {
  background: var(--dsh-good);
}
.pf-meta,
.pf-stuck {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}
.pf-meta {
  color: var(--dsh-ink-3);
}
.pf-stuck {
  color: var(--dsh-ink-2);
}
.pf-node--worst {
  background: var(--dsh-warn-soft);
}
.pf-node--worst .pf-fill {
  background: var(--dsh-warn);
}
.pf-node--worst .pf-stuck {
  color: var(--dsh-warn);
  font-weight: 600;
}
.pf-tag {
  align-self: flex-start;
  margin-top: 2px;
  padding: 1px 8px;
  font-size: 10.5px;
  font-weight: 600;
  color: #fff;
  background: var(--dsh-warn);
  border-radius: 999px;
}
.pf--compact {
  padding: 8px 6px;
}
.pf--compact .pf-value {
  font-size: 20px;
}
.pf--compact .pf-meta,
.pf--compact .pf-node:not(.pf-node--worst) .pf-stuck {
  display: none;
}
@media (prefers-reduced-motion: reduce) {
  .pf-fill {
    transition: none;
  }
}
</style>
