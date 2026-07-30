<script setup lang="ts">
import BaseTable from "@/components/BaseTable.vue";

defineProps<{ items: any[]; isLoading?: boolean }>();

const NEGATIVE_HIGHLIGHT_COLS = [
  "growth_rupiah",
  "growth_persen",
  "run_growth_rupiah",
  "run_growth_persen",
];

const headers = [
  { title: "Year", key: "tahun", width: "70px" },
  { title: "Month", key: "nama_bulan", minWidth: "130px" },
  { title: "MTD Target", key: "target", width: "120px", align: "end" },
  { title: "MTD Actual", key: "aktual", width: "120px", align: "end" },
  { title: "MTD Ach (%)", key: "acv", width: "90px", align: "end" },
  { title: "MTD LY Actual", key: "ly", width: "120px", align: "end" },
  { title: "MTD YoY (%)", key: "yoy", width: "90px", align: "end" },
  { title: "MTD Varince", key: "growth_rupiah", width: "120px", align: "end" },
  {
    title: "MTD Growth (%)",
    key: "growth_persen",
    width: "100px",
    align: "end",
  },
  { title: "YTD Target", key: "run_target", width: "130px", align: "end" },
  { title: "YTD Actual", key: "run_aktual", width: "130px", align: "end" },
  { title: "YTD Ach (%)", key: "run_acv", width: "90px", align: "end" },
  { title: "YTD LY Actual", key: "run_ly", width: "120px", align: "end" },
  { title: "YTD YoY (%)", key: "run_yoy", width: "90px", align: "end" },
  {
    title: "YTD Variance",
    key: "run_growth_rupiah",
    width: "130px",
    align: "end",
  },
  {
    title: "YTD Growth (%)",
    key: "run_growth_persen",
    width: "110px",
    align: "end",
  },
  {
    title: "Projected Sales",
    key: "run_proyeksi",
    width: "130px",
    align: "end",
  },
  {
    title: "Ach to Proj (%)",
    key: "persen_proyeksi",
    width: "120px",
    align: "end",
  },
];

const numFmt = (v: any) =>
  v || v === 0 ? Math.round(Number(v)).toLocaleString("id-ID") : "";
const pctFmt = (v: any) => (v || v === 0 ? `${Number(v).toFixed(2)}%` : "");

const rowPropsFn = (data: any) => {
  const item = data.item?.raw || data.item;
  const nama = String(item?.nama_bulan || "");
  if (nama.includes("QUARTER")) return { class: "row-quarter" };
  if (nama.startsWith("GRAND")) return { class: "row-grand" };
  return {};
};

const negClass = (col: string, val: any) =>
  NEGATIVE_HIGHLIGHT_COLS.includes(col) && Number(val) < 0
    ? "cell-negative"
    : "";

// numFmt: angka biasa. pctFmt: acv & run_acv PINDAH ke sini (bukan numFmt)
const NUM_COLS = [
  "target",
  "aktual",
  "ly",
  "growth_rupiah",
  "run_target",
  "run_aktual",
  "run_ly",
  "run_growth_rupiah",
  "run_proyeksi",
];
const PCT_COLS = [
  "acv",
  "yoy",
  "growth_persen",
  "run_acv",
  "run_yoy",
  "run_growth_persen",
  "persen_proyeksi",
];
</script>

<template>
  <div class="tab-single">
    <BaseTable
      :headers="headers"
      :items="items"
      :is-loading="isLoading"
      item-value="nama_bulan"
      :show-search="false"
      :row-props-fn="rowPropsFn"
    >
      <template v-for="col in NUM_COLS" :key="col" #[`item.${col}`]="{ item }">
        <span :class="negClass(col, item[col])">{{ numFmt(item[col]) }}</span>
      </template>
      <template v-for="col in PCT_COLS" :key="col" #[`item.${col}`]="{ item }">
        <span :class="negClass(col, item[col])">{{ pctFmt(item[col]) }}</span>
      </template>
    </BaseTable>
  </div>
</template>

<style scoped>
.tab-single {
  height: 100%;
  min-height: 0;
}
.cell-negative {
  color: #c62828;
  font-weight: 700;
}
:deep(.row-quarter) {
  background: #e3f2fd !important;
  font-weight: 700;
}
:deep(.row-grand) {
  background: #c8e6c9 !important;
  font-weight: 700;
}
</style>
