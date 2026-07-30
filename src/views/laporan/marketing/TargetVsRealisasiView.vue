<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { targetVsRealisasiService } from "@/services/laporan/marketing/targetVsRealisasiService";
import { exportExcelSingle } from "@/utils/excelExport";
import { IconTarget, IconFileSpreadsheet } from "@tabler/icons-vue";

// ⚠️ MENU_ID kosong — akses ikut parent (966), sesuai instruksi.
// useBrowse & BaseBrowse otomatis skip pengecekan permission FE kalau
// menuId di-pass string kosong; backend (verifyToken doang, tanpa
// checkPermission) yang jadi satu-satunya penjaga akses.
const MENU_ID = "";
const toast = useToast();

const BULAN_OPTIONS = [
  { value: "", title: "Semua Bulan" },
  { value: "1", title: "Januari" },
  { value: "2", title: "Februari" },
  { value: "3", title: "Maret" },
  { value: "4", title: "April" },
  { value: "5", title: "Mei" },
  { value: "6", title: "Juni" },
  { value: "7", title: "Juli" },
  { value: "8", title: "Agustus" },
  { value: "9", title: "September" },
  { value: "10", title: "Oktober" },
  { value: "11", title: "November" },
  { value: "12", title: "Desember" },
];
const BULAN_LABEL_ID: Record<string, string> = Object.fromEntries(
  BULAN_OPTIONS.filter((b) => b.value).map((b) => [
    b.value,
    b.title.toUpperCase(),
  ]),
);

const currentYear = new Date().getFullYear();
const filterState = ref({
  tahun: currentYear,
  bulan: String(new Date().getMonth() + 1),
});

const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: MENU_ID,
  fetchApi: async () => {
    const res = await targetVsRealisasiService.getBrowse(
      filterState.value.tahun,
      filterState.value.bulan,
    );
    return res.data.data || [];
  },
});

watch(
  [() => filterState.value.tahun, () => filterState.value.bulan],
  fetchData,
);

const headers = [
  { title: "Tahun", key: "tahun", width: "80px" },
  { title: "Bulan", key: "bulanLabelId", width: "120px" },
  { title: "Target", key: "target", width: "140px", align: "end" },
  { title: "Riil", key: "realisasi", width: "140px", align: "end" },
  { title: "%", key: "pctAch", width: "90px", align: "end" },
  {
    title: "Riil Tahun Lalu",
    key: "realisasiTahunLalu",
    width: "140px",
    align: "end",
  },
  { title: "Growth", key: "pctGrowth", width: "100px", align: "end" },
];

// Tambah label bulan Indonesia (bulanLabel dari backend = MONTHNAME
// MySQL, defaultnya Inggris — di-map ulang di sini)
const rows = computed(() =>
  (items.value ?? []).map((r: any) => ({
    ...r,
    bulanLabelId: BULAN_LABEL_ID[String(r.bulanNomor)] || r.bulanLabel,
  })),
);

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "-";
const pctFmt = (v: any) => (v || v === 0 ? `${Number(v).toFixed(2)}%` : "-");

// ── Summary — dihitung dari total kolom (SUM realisasi/SUM target),
// bukan rata-rata %ACH per baris. Sama pola summary footer Delphi. ──
const totalTarget = computed(() =>
  rows.value.reduce((s, r) => s + (Number(r.target) || 0), 0),
);
const totalRealisasi = computed(() =>
  rows.value.reduce((s, r) => s + (Number(r.realisasi) || 0), 0),
);
const totalRealisasiTahunLalu = computed(() =>
  rows.value.reduce((s, r) => s + (Number(r.realisasiTahunLalu) || 0), 0),
);
const totalPctAch = computed(() =>
  totalTarget.value > 0 ? (totalRealisasi.value / totalTarget.value) * 100 : 0,
);
const totalGrowth = computed(() =>
  totalRealisasiTahunLalu.value > 0
    ? (totalRealisasi.value / totalRealisasiTahunLalu.value - 1) * 100
    : 0,
);
// ── Daftar tahun untuk dropdown — 2016 s.d. tahun berjalan (otomatis
// nambah tiap tahun, gak perlu update manual kayak combo Delphi yang
// hardcoded list-nya). Urutan naik (2016 di atas), sesuai screenshot.
const YEAR_START = 2016;
const yearOptions = computed(() => {
  const years: number[] = [];
  for (let y = currentYear; y >= YEAR_START; y--) years.push(y);
  return years;
});

// ── Export ──
const isExporting = ref(false);
const onExport = async () => {
  if (!canExport.value) return toast.error("Akses ditolak.");
  const dataRows = rows.value ?? [];
  if (!dataRows.length) return toast.warning("Tidak ada data.");
  isExporting.value = true;
  try {
    await exportExcelSingle(
      `Target_vs_Realisasi_${filterState.value.tahun}${filterState.value.bulan ? "_" + filterState.value.bulan : ""}.xlsx`,
      "Target vs Realisasi",
      [
        { header: "Tahun", key: "tahun", width: 10 },
        { header: "Bulan", key: "bulanLabelId", width: 16 },
        {
          header: "Target",
          key: "target",
          width: 16,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Riil",
          key: "realisasi",
          width: 16,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "%",
          key: "pctAch",
          width: 10,
          align: "right",
          numFmt: "#,##0.00",
        },
        {
          header: "Riil Tahun Lalu",
          key: "realisasiTahunLalu",
          width: 16,
          align: "right",
          numFmt: "#,##0",
        },
        {
          header: "Growth",
          key: "pctGrowth",
          width: 10,
          align: "right",
          numFmt: "#,##0.00",
        },
      ],
      dataRows.map((r) => ({
        tahun: r.tahun,
        bulanLabelId: r.bulanLabelId,
        target: r.target ?? 0,
        realisasi: r.realisasi ?? 0,
        pctAch: r.pctAch ?? 0,
        realisasiTahunLalu: r.realisasiTahunLalu ?? 0,
        pctGrowth: r.pctGrowth ?? 0,
      })),
      `Laporan Year to Date — Tahun ${filterState.value.tahun}`,
    );
  } catch {
    toast.error("Gagal export.");
  } finally {
    isExporting.value = false;
  }
};
</script>

<template>
  <BaseBrowse
    title="Target vs Realisasi"
    :menu-id="MENU_ID"
    :icon="IconTarget"
    :headers="headers"
    :items="rows"
    :is-loading="isLoading"
    :can-export="false"
    item-value="bulanNomor"
    search-placeholder="Cari bulan..."
    @refresh="fetchData"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode</span>
        <select v-model="filterState.bulan" class="f-select">
          <option v-for="b in BULAN_OPTIONS" :key="b.value" :value="b.value">
            {{ b.title }}
          </option>
        </select>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Tahun</span>
        <select
          v-model.number="filterState.tahun"
          class="f-select"
          style="width: 90px"
        >
          <option v-for="y in yearOptions" :key="y" :value="y">
            {{ y }}
          </option>
        </select>
      </div>
    </template>

    <template #extra-actions>
      <v-btn
        size="small"
        color="green"
        :loading="isExporting"
        :disabled="!rows.length"
        @click="onExport"
      >
        <template #prepend><IconFileSpreadsheet :size="15" /></template>Export
      </v-btn>
    </template>

    <template #item.target="{ item }">{{ numFmt(item.target) }}</template>
    <template #item.realisasi="{ item }">{{ numFmt(item.realisasi) }}</template>
    <template #item.pctAch="{ item }">{{ pctFmt(item.pctAch) }}</template>
    <template #item.realisasiTahunLalu="{ item }">{{
      numFmt(item.realisasiTahunLalu)
    }}</template>
    <template #item.pctGrowth="{ item }">{{ pctFmt(item.pctGrowth) }}</template>

    <template #summary-row>
      <div class="ms-bar">
        <span class="ms-item"
          ><span class="ms-lbl">Target</span
          ><span class="ms-val">{{ numFmt(totalTarget) }}</span></span
        >
        <span class="ms-sep">|</span>
        <span class="ms-item"
          ><span class="ms-lbl">Riil</span
          ><span class="ms-val">{{ numFmt(totalRealisasi) }}</span></span
        >
        <span class="ms-sep">|</span>
        <span class="ms-item"
          ><span class="ms-lbl">%</span
          ><span class="ms-val">{{ pctFmt(totalPctAch) }}</span></span
        >
        <span class="ms-sep">|</span>
        <span class="ms-item"
          ><span class="ms-lbl">Riil Th Lalu</span
          ><span class="ms-val">{{
            numFmt(totalRealisasiTahunLalu)
          }}</span></span
        >
        <span class="ms-sep">|</span>
        <span class="ms-item"
          ><span class="ms-lbl">Growth</span
          ><span class="ms-val">{{ pctFmt(totalGrowth) }}</span></span
        >
      </div>
    </template>
  </BaseBrowse>
</template>

<style scoped>
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
.f-date,
.f-select {
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0 6px;
  font-size: 12px;
  background: white;
  outline: none;
  color: #212121;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.ms-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 5px 12px;
  height: 30px;
  min-width: max-content;
}
.ms-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ms-lbl {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-transform: uppercase;
}
.ms-val {
  font-size: 12px;
  font-weight: 700;
  color: white;
  font-family: monospace;
}
.ms-sep {
  color: rgba(255, 255, 255, 0.3);
  font-size: 12px;
}
</style>
