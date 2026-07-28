<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { planSpkVsRealisasiService } from "@/services/garmen/planSpkVsRealisasiService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconChartBar, IconSearch } from "@tabler/icons-vue";
import SpkSearchModal from "@/components/lookups/SpkSearchModal.vue";

const toast = useToast();

// --- STATE FILTER ---
const d = new Date();
const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const firstDay = toLocalDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
const today = toLocalDateStr(d);

const DIVISI_OPTIONS = [
  "CUTTING",
  "CETAK",
  "SUBLIM",
  "BORDIR",
  "JAHIT",
  "FINISHING",
  "KIRIM",
];

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
  divisi: "CUTTING",
  spkNomor: "",
});

const namaSpkHint = ref("");
const showSpkModal = ref(false);

// Label kolom "Realisasi" berubah tergantung divisi (KIRIM vs lainnya)
// — replikasi persis label dinamis di Delphi (SQLDetail).
const realisasiLabel = computed(() =>
  filterState.value.divisi === "KIRIM"
    ? "Realisasi Kirim"
    : "Realisasi Produksi",
);

// --- BROWSE SETUP ---
const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: "82",
  fetchApi: async () => {
    const res = await planSpkVsRealisasiService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      divisi: filterState.value.divisi,
      spkNomor: filterState.value.spkNomor,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- HEADERS ---
const headers = computed(() => [
  { title: "SPK", key: "SPK", width: "130px", fixed: true },
  { title: "Tgl SPK", key: "TglSPK", width: "95px", align: "center" },
  { title: "Kd Cus", key: "KdCus", width: "75px" },
  { title: "Nama", key: "Nama", minWidth: "260px" },
  { title: "Qty SPK", key: "QtySPK", width: "90px", align: "right" },
  { title: "Kain", key: "Kain", minWidth: "160px" },
  { title: "Finishing", key: "Finishing", minWidth: "220px" },
  { title: "Divisi", key: "Divisi", width: "100px" },
  {
    title: "First Planning",
    key: "FirstPlanning",
    width: "105px",
    align: "center",
  },
  { title: "Tot Planning", key: "TotPlanning", width: "100px", align: "right" },
  {
    title: "Last Realisasi",
    key: "LastRealisasi",
    width: "105px",
    align: "center",
  },
  {
    title: "Tot Realisasi",
    key: "TotRealisasi",
    width: "100px",
    align: "right",
  },
  { title: "Selisih Hari", key: "SelisihHari", width: "95px", align: "center" },
]);

// --- HANDLERS ---
onMounted(() => fetchData());
watch(
  () => [
    filterState.value.dtAwal,
    filterState.value.dtAkhir,
    filterState.value.divisi,
    filterState.value.spkNomor,
  ],
  fetchData,
);

// --- SPK filter (F1 modal) ---
const onSpkSelected = (item: any) => {
  filterState.value.spkNomor = item.Nomor;
  namaSpkHint.value = item.Nama || "";
};
const clearSpkFilter = () => {
  filterState.value.spkNomor = "";
  namaSpkHint.value = "";
};

// --- WARNA SelisihHari (negatif = terlambat, positif = lebih awal) ---
const selisihStyle = (val: number) => {
  const n = Number(val) || 0;
  if (n < 0) return "color:#c62828;font-weight:700"; // realisasi lebih lama dari planning
  if (n > 0) return "color:#2e7d32;font-weight:700";
  return "";
};

// --- EXPAND (DETAIL) ---
const expandedRows = ref<any[]>([]);
const detailCache = ref<Record<string, any[]>>({});
const expandedLoading = ref<Record<string, boolean>>({});

const onUpdateExpanded = async (newExpanded: any[]) => {
  expandedRows.value = newExpanded;
  const newlyExpanded = newExpanded.filter(
    (item) => !detailCache.value[item.SPK] && !expandedLoading.value[item.SPK],
  );

  for (const item of newlyExpanded) {
    const nomor = item.SPK;
    expandedLoading.value[nomor] = true;
    try {
      const res = await planSpkVsRealisasiService.getDetail(
        nomor,
        filterState.value.divisi,
      );
      detailCache.value[nomor] = res.data.data;
    } catch {
      toast.error(`Gagal memuat detail ${nomor}`);
    } finally {
      expandedLoading.value[nomor] = false;
    }
  }
};

// Reset cache detail kalau divisi filter berubah (data lama gak
// relevan lagi karena source realisasi-nya beda per divisi)
watch(
  () => filterState.value.divisi,
  () => {
    detailCache.value = {};
    expandedRows.value = [];
  },
);

// --- TOTALS (info ringkas, replikasi skSum Delphi TotPlanning & TotRealisasi) ---
const totalPlanning = computed(() =>
  (items.value ?? []).reduce(
    (s: number, r: any) => s + (Number(r.TotPlanning) || 0),
    0,
  ),
);
const totalRealisasi = computed(() =>
  (items.value ?? []).reduce(
    (s: number, r: any) => s + (Number(r.TotRealisasi) || 0),
    0,
  ),
);

// --- EXPORT ---
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    const columns: ExcelColumn[] = [
      { header: "SPK", key: "SPK", width: 18 },
      { header: "Tgl SPK", key: "TglSPK", width: 14, align: "center" },
      { header: "Kd Cus", key: "KdCus", width: 12 },
      { header: "Nama", key: "Nama", width: 32 },
      {
        header: "Qty SPK",
        key: "QtySPK",
        width: 12,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Kain", key: "Kain", width: 20 },
      { header: "Finishing", key: "Finishing", width: 26 },
      { header: "Divisi", key: "Divisi", width: 14 },
      {
        header: "First Planning",
        key: "FirstPlanning",
        width: 14,
        align: "center",
      },
      {
        header: "Tot Planning",
        key: "TotPlanning",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Last Realisasi",
        key: "LastRealisasi",
        width: 14,
        align: "center",
      },
      {
        header: "Tot Realisasi",
        key: "TotRealisasi",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      {
        header: "Selisih Hari",
        key: "SelisihHari",
        width: 12,
        align: "center",
      },
    ];

    const rows = items.value.map((it: any) => ({
      ...it,
      TglSPK: formatTanggal(it.TglSPK),
      FirstPlanning: it.FirstPlanning ? formatTanggal(it.FirstPlanning) : "-",
      LastRealisasi: it.LastRealisasi ? formatTanggal(it.LastRealisasi) : "-",
    }));

    await exportExcelSingle(
      `Planning_vs_Realisasi_${filterState.value.divisi}_${today}.xlsx`,
      "Planning vs Realisasi",
      columns,
      rows,
      `Planning SPK vs Realisasi (${filterState.value.divisi})  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
    );

    toast.success("Berhasil export data.");
  } catch (e) {
    console.error(e);
    toast.error("Terjadi kesalahan saat export.");
  }
};

const numFmt = (v: any) =>
  v || v === 0 ? Number(v).toLocaleString("id-ID") : "0";
</script>

<template>
  <BaseBrowse
    title="Planning SPK vs Realisasi"
    menu-id="82"
    :icon="IconChartBar"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    item-value="SPK"
    @refresh="fetchData"
    @export="onExport"
    show-expand
    :expanded="expandedRows"
    @update:expanded="onUpdateExpanded"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Tanggal SPK</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Divisi</span>
        <select v-model="filterState.divisi" class="f-select">
          <option v-for="dv in DIVISI_OPTIONS" :key="dv" :value="dv">
            {{ dv }}
          </option>
        </select>
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">SPK</span>
        <div class="igrp">
          <input
            v-model="filterState.spkNomor"
            class="f-inp"
            style="width: 140px; background: #fff9c4"
            placeholder="F1/cari..."
            @keydown.f1.prevent="showSpkModal = true"
          />
          <button type="button" class="blkp" @click="showSpkModal = true">
            <IconSearch :size="12" color="#1565c0" />
          </button>
        </div>
        <span v-if="namaSpkHint" class="hint-text">{{ namaSpkHint }}</span>
        <button
          v-if="filterState.spkNomor"
          class="f-clear"
          @click="clearSpkFilter"
        >
          ✕
        </button>
      </div>
      <div class="f-divider" />
      <div class="totals-info">
        <span
          >Total Planning: <b>{{ numFmt(totalPlanning) }}</b></span
        >
        <span class="ml-3"
          >Total Realisasi: <b>{{ numFmt(totalRealisasi) }}</b></span
        >
      </div>
    </template>

    <template #item.TglSPK="{ item }">{{
      formatTanggal(item.TglSPK)
    }}</template>
    <template #item.QtySPK="{ item }">{{ numFmt(item.QtySPK) }}</template>
    <template #item.FirstPlanning="{ item }">{{
      item.FirstPlanning ? formatTanggal(item.FirstPlanning) : "-"
    }}</template>
    <template #item.TotPlanning="{ item }">{{
      numFmt(item.TotPlanning)
    }}</template>
    <template #item.LastRealisasi="{ item }">{{
      item.LastRealisasi ? formatTanggal(item.LastRealisasi) : "-"
    }}</template>
    <template #item.TotRealisasi="{ item }">{{
      numFmt(item.TotRealisasi)
    }}</template>
    <template #item.SelisihHari="{ item }">
      <span :style="selisihStyle(item.SelisihHari)">{{
        item.SelisihHari
      }}</span>
    </template>

    <!-- Detail Expand -->
    <template #detail="{ item }">
      <div class="expand-wrap">
        <v-progress-linear
          v-if="expandedLoading[item.SPK]"
          indeterminate
          color="primary"
          height="2"
        />
        <div v-else>
          <div class="expand-title mb-2">
            Detail Planning vs Realisasi - {{ item.SPK }} ({{
              filterState.divisi
            }})
          </div>
          <table class="detail-table">
            <thead>
              <tr>
                <th width="110">Tanggal</th>
                <th width="100" class="tr">Plan</th>
                <th width="120" class="tr">{{ realisasiLabel }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(dRow, i) in detailCache[item.SPK]" :key="i">
                <td>{{ formatTanggal(dRow.Tanggal) }}</td>
                <td class="tr">{{ numFmt(dRow.Plan) }}</td>
                <td class="tr">
                  {{
                    numFmt(
                      filterState.divisi === "KIRIM"
                        ? dRow.RealisasiKirim
                        : dRow.RealisasiProduksi,
                    )
                  }}
                </td>
              </tr>
              <tr
                v-if="
                  !detailCache[item.SPK] || detailCache[item.SPK].length === 0
                "
              >
                <td colspan="3" class="text-center text-grey py-3 font-italic">
                  Tidak ada data planning/realisasi untuk SPK ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </BaseBrowse>

  <SpkSearchModal
    v-model="showSpkModal"
    filter-mode="spk-ppic"
    @selected="onSpkSelected"
  />
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
  outline: none;
  background: white;
  color: #212121;
}
.f-sep {
  font-size: 11px;
  color: #777;
}
.f-divider {
  width: 1px;
  height: 20px;
  background: #ddd;
  margin: 0 8px;
}
.f-clear {
  background: none;
  border: none;
  color: #f44336;
  cursor: pointer;
  font-size: 13px;
  padding: 0 2px;
}
.hint-text {
  font-size: 10.5px;
  color: #757575;
  font-style: italic;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.igrp {
  display: flex;
  border: 1px solid #a0a0a0;
  overflow: hidden;
  height: 28px;
  background: white;
  flex-shrink: 0;
}
.f-inp {
  border: none;
  height: 26px;
  padding: 0 6px;
  font-size: 12px;
  outline: none;
}
.blkp {
  width: 24px;
  min-width: 24px;
  flex-shrink: 0;
  background: #e3f2fd;
  border: none;
  border-left: 1px solid #a0a0a0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.blkp:hover {
  background: #bbdefb;
}

.totals-info {
  font-size: 11px;
  color: #37474f;
  white-space: nowrap;
}
.ml-3 {
  margin-left: 14px;
}

.expand-wrap {
  padding: 10px 10px 10px 40px;
  background: #eceff1;
}
.expand-title {
  font-size: 12px;
  font-weight: bold;
  color: #1565c0;
  text-transform: uppercase;
}
.detail-table {
  width: 100%;
  max-width: 500px;
  border-collapse: collapse;
  background: white;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  font-size: 11px;
}
.detail-table th {
  background: #546e7a;
  color: white;
  text-align: left;
  padding: 6px 8px;
  font-weight: bold;
}
.detail-table td {
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
}
.tr {
  text-align: right !important;
}
</style>
