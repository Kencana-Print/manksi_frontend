<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { planningPerTanggalService } from "@/services/garmen/planningPerTanggalService";
import { exportExcelSingle, type ExcelColumn } from "@/utils/excelExport";
import { formatTanggal } from "@/utils/dateFormat";
import { IconCalendarDue, IconSearch } from "@tabler/icons-vue";
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
  "BAHAN DATANG",
  "CUTTING",
  "CETAK",
  "BORDIR",
  "JAHIT",
  "FINISHING",
  "KIRIM",
];

const filterState = ref({
  dtAwal: firstDay,
  dtAkhir: today,
  workshop: "ALL",
  divisi: "CUTTING",
  spkNomor: "",
});

const namaSpkHint = ref("");
const showSpkModal = ref(false);

// --- BROWSE SETUP ---
const { items, isLoading, canExport, fetchData } = useBrowse({
  menuId: "81",
  fetchApi: async () => {
    const res = await planningPerTanggalService.getBrowse({
      startDate: filterState.value.dtAwal,
      endDate: filterState.value.dtAkhir,
      workshop: filterState.value.workshop,
      divisi: filterState.value.divisi,
      spkNomor: filterState.value.spkNomor,
    });
    return res.data.data;
  },
  immediate: false,
});

// --- HEADERS ---
const headers = [
  {
    title: "Tgl Planning",
    key: "TglPlanning",
    width: "100px",
    align: "center",
  },
  { title: "SPK", key: "SPK", width: "130px" },
  { title: "Cab", key: "Cab", width: "55px", align: "center" },
  { title: "Workshop", key: "Workshop", width: "90px" },
  { title: "Kd Cus", key: "KdCus", width: "75px" },
  { title: "Nama", key: "Nama", minWidth: "220px" },
  { title: "Qty SPK", key: "QtySPK", width: "90px", align: "right" },
  { title: "Kain", key: "Kain", minWidth: "160px" },
  { title: "Finishing", key: "Finishing", minWidth: "220px" },
  { title: "Qty Planning", key: "QtyPlanning", width: "100px", align: "right" },
  { title: "Keterangan", key: "Keterangan", minWidth: "200px" },
];

// --- HANDLERS ---
onMounted(() => fetchData());
watch(
  () => [
    filterState.value.dtAwal,
    filterState.value.dtAkhir,
    filterState.value.workshop,
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

// --- EXPORT ---
const onExport = async () => {
  if (!items.value || items.value.length === 0) {
    return toast.warning("Tidak ada data untuk diexport.");
  }
  try {
    const columns: ExcelColumn[] = [
      {
        header: "Tgl Planning",
        key: "TglPlanning",
        width: 14,
        align: "center",
      },
      { header: "SPK", key: "SPK", width: 18 },
      { header: "Cab", key: "Cab", width: 10, align: "center" },
      { header: "Workshop", key: "Workshop", width: 14 },
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
      {
        header: "Qty Planning",
        key: "QtyPlanning",
        width: 14,
        align: "right",
        numFmt: "#,##0",
      },
      { header: "Keterangan", key: "Keterangan", width: 26 },
    ];

    const rows = items.value.map((it: any) => ({
      ...it,
      TglPlanning: formatTanggal(it.TglPlanning),
    }));

    await exportExcelSingle(
      `Planning_Per_Tanggal_${filterState.value.divisi}_${today}.xlsx`,
      "Planning per Tanggal",
      columns,
      rows,
      `Planning per Tanggal (${filterState.value.divisi})  |  Periode: ${formatTanggal(filterState.value.dtAwal)} s.d ${formatTanggal(filterState.value.dtAkhir)}`,
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
    title="Planning per Tanggal"
    menu-id="81"
    :icon="IconCalendarDue"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:filter-state="filterState"
    :can-insert="false"
    :can-edit="false"
    :can-delete="false"
    :can-export="canExport"
    item-value="SPK"
    summary-key="QtyPlanning"
    summary-label="Total Qty Planning"
    @refresh="fetchData"
    @export="onExport"
  >
    <template #filter-left>
      <div class="f-group">
        <span class="f-label">Periode (Tgl Planning)</span>
        <input type="date" v-model="filterState.dtAwal" class="f-date" />
        <span class="f-sep">s/d</span>
        <input type="date" v-model="filterState.dtAkhir" class="f-date" />
      </div>
      <div class="f-divider" />
      <div class="f-group">
        <span class="f-label">Workshop</span>
        <select v-model="filterState.workshop" class="f-select">
          <option value="ALL">ALL</option>
          <option value="P01">P01</option>
          <option value="P04">P04</option>
        </select>
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
    </template>

    <template #item.TglPlanning="{ item }">
      {{ formatTanggal(item.TglPlanning) }}
    </template>
    <template #item.QtySPK="{ item }">{{ numFmt(item.QtySPK) }}</template>
    <template #item.QtyPlanning="{ item }">{{
      numFmt(item.QtyPlanning)
    }}</template>
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
</style>
