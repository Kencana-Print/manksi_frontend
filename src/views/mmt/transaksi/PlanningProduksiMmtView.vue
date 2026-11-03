<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconCalendarStats } from "@tabler/icons-vue";
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

const startDate = ref(getStartOfMonth());
const endDate = ref(getToday());

const headers = [
  { title: "No. SPK", key: "Nomor", width: "160px" },
  { title: "Deadline", key: "Dateline", width: "110px", align: "center" },
  { title: "Tipe", key: "Tipe", width: "80px", align: "center" },
  { title: "Cab", key: "Cab", width: "70px", align: "center" },
  { title: "Kepentingan", key: "Kepentingan", width: "110px", align: "center" },
  { title: "Nama SPK", key: "NamaSPK", minWidth: "200px" },
  { title: "Panjang", key: "Panjang", width: "90px", align: "end" },
  { title: "Lebar", key: "Lebar", width: "90px", align: "end" },
  { title: "Jml SPK", key: "JumlahSPK", width: "90px", align: "end" },
  { title: "Bahan", key: "Bahan", width: "130px" },
  { title: "Finishing", key: "Finishing", width: "130px" },
  { title: "Plan Datang", key: "Plan_Bhn_Datang", width: "100px", align: "end" },
  { title: "Plan Cetak", key: "Plancetak", width: "100px", align: "end" },
  { title: "Plan Finishing", key: "Plan_finishing", width: "110px", align: "end" },
  { title: "Plan Kirim", key: "Plan_kirim", width: "100px", align: "end" },
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
  menuId: "5518",
  fetchApi: async () => {
    const res = await api.get("/mmt/planning-produksi/browse", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },
});
</script>

<template>
  <BaseBrowse
    title="Planning Produksi MMT"
    menu-id="5518"
    :icon="IconCalendarStats"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Planning_Produksi_MMT')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" @change="fetchData" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" @change="fetchData" />
      </div>
    </template>

    <template #item.Dateline="{ item }">
      {{ formatTanggal((item.raw || item).Dateline) }}
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group { display: flex; align-items: center; gap: 4px; }
.filter-label { font-size: 11px; font-weight: 600; color: #555; margin-right: 2px; }
.filter-sep { font-size: 11px; color: #777; }
.date-inp { height: 26px; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px; font-size: 11px; background: white; color: #212121; }
</style>
