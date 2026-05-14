<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { realisasiPenawaranService } from "@/services/laporan/realisasiPenawaranService";
import { IconReportAnalytics } from "@tabler/icons-vue";

// Gunakan local date — JANGAN pakai toISOString() karena UTC bisa mundur 1 hari di WIB
const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

const today = new Date();
const firstDayOfMonth = toLocalDate(
  new Date(today.getFullYear(), today.getMonth(), 1),
);
const todayString = toLocalDate(today);

const filters = ref({
  startDate: firstDayOfMonth,
  endDate: todayString,
});

const { items, isLoading, canExport, fetchData, exportToExcel } = useBrowse({
  menuId: "302",
  fetchApi: async () => {
    const res = await realisasiPenawaranService.getBrowse({
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
    });
    return res.data.data;
  },
  immediate: true,
});

watch([() => filters.value.startDate, () => filters.value.endDate], fetchData);

const masterHeaders = [
  { title: "Divisi", key: "Divisi", width: "110px" },
  { title: "Customer", key: "Customer", minWidth: "180px" },
  { title: "Jumlah", key: "Jumlah", width: "70px", align: "center" },
  { title: "Qty", key: "Qty", width: "90px", align: "right" },
  { title: "Satuan", key: "Satuan", width: "70px", align: "center" },
  { title: "Nominal", key: "Nominal", width: "130px", align: "right" },
  { title: "Close", key: "Close", width: "120px", align: "right" },
  { title: "% Close", key: "PercClose", width: "75px", align: "right" },
  { title: "Batal", key: "Batal", width: "120px", align: "right" },
  { title: "% Batal", key: "PercBatal", width: "75px", align: "right" },
  { title: "Open", key: "Open", width: "120px", align: "right" },
  { title: "% Open", key: "PercOpen", width: "75px", align: "right" },
];

const num = (val: any) =>
  new Intl.NumberFormat("id-ID").format(Number(val) || 0);
const pct = (val: any) => (Number(val) || 0).toFixed(2) + "%";

const grandTotal = computed(() =>
  items.value.reduce(
    (acc: any, curr: any) => {
      acc.nominal += Number(curr.Nominal) || 0;
      acc.close += Number(curr.Close) || 0;
      acc.batal += Number(curr.Batal) || 0;
      acc.open += Number(curr.Open) || 0;
      return acc;
    },
    { nominal: 0, close: 0, batal: 0, open: 0 },
  ),
);

// % konversi dari grand total
const pctClose = computed(() =>
  grandTotal.value.nominal
    ? ((grandTotal.value.close / grandTotal.value.nominal) * 100).toFixed(2)
    : "0.00",
);
const pctOpen = computed(() =>
  grandTotal.value.nominal
    ? ((grandTotal.value.open / grandTotal.value.nominal) * 100).toFixed(2)
    : "0.00",
);
</script>

<template>
  <BaseBrowse
    title="Realisasi Penawaran"
    menu-id="302"
    :icon="IconReportAnalytics"
    :headers="masterHeaders"
    :items="items"
    :is-loading="isLoading"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    item-value="Customer"
    v-model:filter-state="filters"
    @refresh="fetchData"
    @export="exportToExcel('Laporan_Realisasi_Penawaran')"
  >
    <!-- ── Filter ── -->
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal</span>
        <input type="date" v-model="filters.startDate" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filters.endDate" class="f-date" />
      </div>
    </template>

    <!-- ── Format kolom angka ── -->
    <template #item.Jumlah="{ item }">{{ num(item.Jumlah) }}</template>
    <template #item.Qty="{ item }">{{ num(item.Qty) }}</template>

    <template #item.Nominal="{ item }">
      <span class="fw text-primary">{{ num(item.Nominal) }}</span>
    </template>
    <template #item.Close="{ item }">
      <span
        :class="Number(item.Close) > 0 ? 'fw text-success-dark' : 'text-grey'"
      >
        {{ num(item.Close) }}
      </span>
    </template>
    <template #item.PercClose="{ item }">
      <span
        :class="Number(item.PercClose) >= 100 ? 'fw text-success-dark' : ''"
      >
        {{ pct(item.PercClose) }}
      </span>
    </template>
    <template #item.Batal="{ item }">
      <span :class="Number(item.Batal) > 0 ? 'fw text-error' : 'text-grey'">
        {{ num(item.Batal) }}
      </span>
    </template>
    <template #item.PercBatal="{ item }">
      <span :class="Number(item.PercBatal) > 0 ? 'text-error' : 'text-grey'">
        {{ pct(item.PercBatal) }}
      </span>
    </template>
    <template #item.Open="{ item }">
      <span
        :class="Number(item.Open) > 0 ? 'fw text-warning-dark' : 'text-grey'"
      >
        {{ num(item.Open) }}
      </span>
    </template>
    <template #item.PercOpen="{ item }">{{ pct(item.PercOpen) }}</template>

    <!-- ── Summary row ── -->
    <template #summary-row>
      <div class="summary-bar">
        <div class="s-group">
          <span class="s-lbl">Total Nominal</span>
          <span class="s-val s-nominal">{{ num(grandTotal.nominal) }}</span>
        </div>
        <div class="s-div" />
        <div class="s-group">
          <span class="s-lbl">Close</span>
          <span class="s-val s-close">{{ num(grandTotal.close) }}</span>
          <span class="s-pct">({{ pctClose }}%)</span>
        </div>
        <div class="s-div" />
        <div class="s-group">
          <span class="s-lbl">Batal</span>
          <span class="s-val s-batal">{{ num(grandTotal.batal) }}</span>
        </div>
        <div class="s-div" />
        <div class="s-group">
          <span class="s-lbl">Open</span>
          <span class="s-val s-open">{{ num(grandTotal.open) }}</span>
          <span class="s-pct">({{ pctOpen }}%)</span>
        </div>
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
/* ── Filter bar ── */
.f-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.f-label {
  font-size: 11px;
  font-weight: 700;
  color: #555;
  white-space: nowrap;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-date {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
}
.f-date:focus {
  border-color: #1565c0;
}

/* ── Summary bar ── */
.summary-bar {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 16px;
  height: 100%;
  flex-wrap: wrap;
  row-gap: 4px;
}
.s-group {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 0 12px;
}
.s-div {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}
.s-lbl {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.s-val {
  font-size: 13px;
  font-weight: 700;
  color: white;
  white-space: nowrap;
}
.s-pct {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  white-space: nowrap;
}

/* warna nilai summary */
.s-nominal {
  color: #ffca28;
}
.s-close {
  color: #69f0ae;
}
.s-batal {
  color: #ff8a80;
}
.s-open {
  color: #ffffff;
}

/* ── Warna kolom tabel ── */
.fw {
  font-weight: 700;
}
.text-success-dark {
  color: #2e7d32;
}
.text-warning-dark {
  color: #e65100;
}
.text-grey {
  color: #bdbdbd;
}
</style>
