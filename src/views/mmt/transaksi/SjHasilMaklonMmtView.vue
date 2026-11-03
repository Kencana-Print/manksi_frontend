<script setup lang="ts">
import { ref, watch } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconTruckDelivery, IconClock, IconHistory } from "@tabler/icons-vue";
import api from "@/services/api";
import { formatTanggal } from "@/utils/dateFormat";

const getStartOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};
const getToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const activeTab = ref<"outstanding" | "history">("outstanding");
const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

const outstandingHeaders = [
  { title: "No. Maklon", key: "MklNomor", width: "150px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Cabang Asal", key: "NamaCabAsal", width: "140px" },
  { title: "Cabang Tujuan", key: "NamaCabTujuan", width: "140px" },
  { title: "Barang Polos", key: "NamaPolos", minWidth: "170px" },
  { title: "Barang Hasil", key: "NamaHasil", minWidth: "170px" },
  { title: "Qty Masuk", key: "QtyMasuk", width: "90px", align: "end" },
  { title: "Qty Hasil", key: "QtyHasil", width: "90px", align: "end" },
  { title: "BS / Afval", key: "BsAfval", width: "90px", align: "end" },
  { title: "Sumber", key: "Sumber", width: "80px", align: "center" },
];

const historyHeaders = [
  { title: "No. SJ", key: "sjm_nomor", width: "160px" },
  { title: "Tanggal", key: "sjm_tanggal", width: "110px", align: "center" },
  { title: "No. Maklon", key: "sjm_mkl_nomor", width: "150px" },
  { title: "Cabang Tujuan", key: "NamaCabTujuan", width: "150px" },
  { title: "User", key: "sjm_user_create", width: "100px" },
  { title: "Keterangan", key: "sjm_keterangan", minWidth: "180px" },
];

const {
  items,
  isLoading,
  selected,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  fetchData,
  exportToExcel,
} = useBrowse<any>({
  menuId: "5517",
  fetchApi: async () => {
    const url = activeTab.value === "outstanding"
      ? "/mmt/sj-hasil-maklon/outstanding"
      : "/mmt/sj-hasil-maklon/history";
    const res = await api.get(url, {
      params: { startDate: startDate.value, endDate: endDate.value, semuaCabang: true },
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },
});

watch(activeTab, () => {
  fetchData();
});
</script>

<template>
  <BaseBrowse
    :title="activeTab === 'outstanding' ? 'SJ Hasil Maklon — Outstanding' : 'SJ Hasil Maklon — Riwayat'"
    menu-id="5517"
    :icon="IconTruckDelivery"
    :headers="activeTab === 'outstanding' ? outstandingHeaders : historyHeaders"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('SJ_Hasil_Maklon_MMT')"
  >
    <template #filter-left>
      <div class="d-flex align-center ga-2">
        <v-btn-toggle v-model="activeTab" mandatory density="compact" color="primary" variant="outlined">
          <v-btn value="outstanding" size="small" class="text-none">
            <IconClock :size="14" class="mr-1" /> Outstanding
          </v-btn>
          <v-btn value="history" size="small" class="text-none">
            <IconHistory :size="14" class="mr-1" /> Riwayat
          </v-btn>
        </v-btn-toggle>

        <div class="filter-group ml-2">
          <span class="filter-label">Periode</span>
          <input type="date" v-model="startDate" class="date-inp" @change="fetchData" />
          <span class="filter-sep">s/d</span>
          <input type="date" v-model="endDate" class="date-inp" @change="fetchData" />
        </div>
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
    <template #item.sjm_tanggal="{ item }">
      {{ formatTanggal((item.raw || item).sjm_tanggal) }}
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group { display: flex; align-items: center; gap: 4px; }
.filter-label { font-size: 11px; font-weight: 600; color: #555; margin-right: 2px; }
.filter-sep { font-size: 11px; color: #777; }
.date-inp { height: 26px; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px; font-size: 11px; background: white; color: #212121; }
</style>
