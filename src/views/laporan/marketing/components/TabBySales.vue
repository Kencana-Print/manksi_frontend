<script setup lang="ts">
import { computed } from "vue";
import BaseTable from "@/components/BaseTable.vue";
import AchievementChart from "@/components/AchievementChart.vue";

const props = defineProps<{ items: any[]; isLoading?: boolean }>();

const headers = [
  { title: "Tahun", key: "tahun", width: "45px" },
  { title: "Bulan", key: "Bulan", width: "65px" },
  { title: "Kode", key: "SalKode", width: "40px" },
  { title: "Nama Sales", key: "SalNama", minWidth: "150px" },
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
  if (item?.SalNama?.startsWith("SUB TOTAL")) return { class: "row-sub-total" };
  return {};
};

const chartLabels = computed(() => props.items.map((r) => r.SalNama));
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
        item-value="SalKode"
        :show-search="false"
        :row-props-fn="rowPropsFn"
      >
        <template #item.Target="{ item }">{{ numFmt(item.Target) }}</template>
        <template #item.Realisasi="{ item }">{{
          numFmt(item.Realisasi)
        }}</template>
        <template #item.Ach="{ item }">{{ pctFmt(item.Ach) }}</template>
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
  overflow-y: auto;
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
