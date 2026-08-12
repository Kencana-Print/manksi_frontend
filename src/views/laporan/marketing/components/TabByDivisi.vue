<script setup lang="ts">
import { computed } from "vue";
import BaseTable from "@/components/BaseTable.vue";
import AchievementChart from "@/components/AchievementChart.vue";

const props = defineProps<{ items: any[]; isLoading?: boolean }>();

const headers = [
  { title: "Tahun", key: "tahun", width: "60px" },
  { title: "Bulan", key: "Bulan", width: "80px" },
  { title: "Divisi", key: "Divisi", minWidth: "140px" },
  { title: "Target", key: "Target", width: "140px", align: "end" },
  { title: "Realisasi", key: "Realisasi", width: "140px", align: "end" },
  { title: "Ach(%)", key: "Ach", width: "90px", align: "end" },
];

const numFmt = (v: any) =>
  v || v === 0 ? Math.round(Number(v)).toLocaleString("id-ID") : "";
const pctFmt = (v: any) => (v || v === 0 ? `${Number(v).toFixed(2)}%` : "");

// Footer — Ach% dihitung ulang SUM(realisasi)/SUM(target)*100,
// BUKAN rata-rata kolom Ach (replikasi Items2GetText Delphi)
const totalTarget = computed(() =>
  props.items.reduce((s, r) => s + (Number(r.Target) || 0), 0),
);
const totalRealisasi = computed(() =>
  props.items.reduce((s, r) => s + (Number(r.Realisasi) || 0), 0),
);
const totalAch = computed(() =>
  totalTarget.value > 0 ? (totalRealisasi.value / totalTarget.value) * 100 : 0,
);

const chartLabels = computed(() => props.items.map((r) => r.Divisi));
const chartTarget = computed(() =>
  props.items.map((r) => Number(r.Target) || 0),
);
const chartRealisasi = computed(() =>
  props.items.map((r) => Number(r.Realisasi) || 0),
);
const chartAch = computed(() => props.items.map((r) => Number(r.Ach) || 0));
</script>

<template>
  <div class="tab-layout">
    <div class="tab-table">
      <BaseTable
        :headers="headers"
        :items="items"
        :is-loading="isLoading"
        item-value="Divisi"
        :show-search="false"
      >
        <template #item.Target="{ item }">{{ numFmt(item.Target) }}</template>
        <template #item.Realisasi="{ item }">{{
          numFmt(item.Realisasi)
        }}</template>
        <template #item.Ach="{ item }">{{ pctFmt(item.Ach) }}</template>
        <template #summary-row>
          <span class="sum-lbl">Total</span>
          <span class="sum-val">{{ numFmt(totalTarget) }}</span>
          <span class="sum-val">{{ numFmt(totalRealisasi) }}</span>
          <span class="sum-val">{{ totalAch.toFixed(2) }}%</span>
        </template>
      </BaseTable>
    </div>
    <div class="tab-chart">
      <AchievementChart
        title="Achievement by Divisi"
        :labels="chartLabels"
        :target="chartTarget"
        :realisasi="chartRealisasi"
        :ach="chartAch"
      />
    </div>
  </div>
</template>

<style scoped>
.tab-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 16px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
.tab-table {
  flex: 1 1 520px;
  max-width: 720px;
  min-width: 300px;
  max-height: 100%;
  overflow: auto;
}
.tab-chart {
  flex: 1 1 420px;
  min-width: 300px;
  max-width: 100%;
  height: 460px;
}

@media (max-width: 980px) {
  .tab-layout {
    flex-direction: column;
    flex-wrap: nowrap;
  }
  .tab-table,
  .tab-chart {
    flex: 1 1 auto;
    width: 100%;
    max-width: 100%;
  }
  .tab-chart {
    height: 400px;
  }
}

.sum-lbl {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-right: 8px;
}
.sum-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-family: monospace;
  margin-right: 16px;
}
</style>
