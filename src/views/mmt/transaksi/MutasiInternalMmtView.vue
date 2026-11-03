<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconArrowsExchange } from "@tabler/icons-vue";
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
  { title: "No. Mutasi", key: "Nomor_Mutasi", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "110px", align: "center" },
  { title: "Bagian Asal", key: "Bagian_Asal", width: "140px" },
  { title: "Bagian Tujuan", key: "Bagian_Tujuan", width: "140px" },
  { title: "Total Qty", key: "Total_Qty", width: "90px", align: "end" },
  { title: "Status", key: "Status", width: "90px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "180px" },
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
  menuId: "5529",
  fetchApi: async () => {
    const res = await api.get("/mmt/mutasi-internal", {
      params: { startDate: startDate.value, endDate: endDate.value },
    });
    return res.data?.data || (Array.isArray(res.data) ? res.data : []);
  },
});
</script>

<template>
  <BaseBrowse
    title="Mutasi Internal MMT"
    menu-id="5529"
    :icon="IconArrowsExchange"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Mutasi_Internal_MMT')"
  >
    <template #filter-left>
      <div class="filter-group">
        <span class="filter-label">Periode</span>
        <input type="date" v-model="startDate" class="date-inp" @change="fetchData" />
        <span class="filter-sep">s/d</span>
        <input type="date" v-model="endDate" class="date-inp" @change="fetchData" />
      </div>
    </template>

    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
  </BaseBrowse>
</template>

<style scoped>
.filter-group { display: flex; align-items: center; gap: 4px; }
.filter-label { font-size: 11px; font-weight: 600; color: #555; margin-right: 2px; }
.filter-sep { font-size: 11px; color: #777; }
.date-inp { height: 26px; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px; font-size: 11px; background: white; color: #212121; }
</style>
