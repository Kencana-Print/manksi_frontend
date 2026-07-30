<script setup lang="ts">
import { computed } from "vue";
import BaseTable from "@/components/BaseTable.vue";
import AchievementChart from "@/components/AchievementChart.vue";

const props = defineProps<{ items: any[]; isLoading?: boolean }>();

const headers = [
  { title: "Kode", key: "SalKode", width: "80px" },
  { title: "Nama Sales", key: "SalNama", minWidth: "200px" },
  { title: "Target", key: "Target", width: "150px", align: "end" },
  { title: "Realisasi", key: "Realisasi", width: "150px", align: "end" },
  { title: "Ach(%)", key: "Ach", width: "90px", align: "end" },
];

const numFmt = (v: any) =>
  v || v === 0 ? Math.round(Number(v)).toLocaleString("id-ID") : "";
const pctFmt = (v: any) => (v || v === 0 ? `${Number(v).toFixed(2)}%` : "");

// Row styling — replikasi cxGridDBBandedTableView1StylesGetContentStyle
const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  if (item?.SalNama === "GRAND TOTAL") return { class: "row-grand-total" };
  if (item?.SalNama === "SUB TOTAL") return { class: "row-sub-total" };
  return {};
};

// Footer & chart cuma pakai baris per-sales (Urut=1), biar gak
// double-count subtotal/grand total
const detailRows = computed(() => props.items.filter((r) => r.Urut === 1));
const totalTarget = computed(() =>
  detailRows.value.reduce((s, r) => s + (Number(r.Target) || 0), 0),
);
const totalRealisasi = computed(() =>
  detailRows.value.reduce((s, r) => s + (Number(r.Realisasi) || 0), 0),
);
const totalAch = computed(() =>
  totalTarget.value > 0 ? (totalRealisasi.value / totalTarget.value) * 100 : 0,
);

const chartLabels = computed(() => detailRows.value.map((r) => r.SalNama));
const chartTarget = computed(() =>
  detailRows.value.map((r) => Number(r.Target) || 0),
);
const chartRealisasi = computed(() =>
  detailRows.value.map((r) => Number(r.Realisasi) || 0),
);
const chartAch = computed(() =>
  detailRows.value.map((r) => Number(r.Ach) || 0),
);
</script>

<template>
  <div class="tab-layout">
    <div class="tab-table">
      <BaseTable
        :headers="headers"
        :items="items"
        :is-loading="isLoading"
        item-value="SalKode"
        :show-search="false"
        :row-props-fn="rowPropsFn"
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
        title="Achievement by Sales"
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
  gap: 16px;
  height: 100%;
  min-height: 0;
}
.tab-table {
  flex: 0 0 680px;
  min-width: 0;
  height: 100%;
}
.tab-chart {
  flex: 1;
  min-width: 320px;
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
:deep(.row-sub-total) {
  background: #fff3cd !important;
  font-weight: 700;
}
:deep(.row-grand-total) {
  background: #cfe2ff !important;
  font-weight: 700;
}
</style>
