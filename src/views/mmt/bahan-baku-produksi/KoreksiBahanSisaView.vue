<script setup lang="ts">
import { ref } from "vue";
import BaseBrowse from "@/components/BaseBrowse.vue";
import { useBrowse } from "@/composables/useBrowse";
import { IconRecycle } from "@tabler/icons-vue";
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
  { title: "Nomor Koreksi", key: "Nomor", width: "160px" },
  { title: "Tanggal", key: "Tanggal", width: "120px", align: "center" },
  { title: "Gudang", key: "Gudang", minWidth: "160px" },
  { title: "Tipe", key: "Tipe", width: "120px", align: "center" },
  { title: "Keterangan", key: "Keterangan", minWidth: "220px" },
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
  menuId: "5531",
  fetchApi: async () => {
    const res = await api.get("/mmt/koreksi-stok", {
      params: { startDate: startDate.value, endDate: endDate.value, isBs: 1 },
    });
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },
});
</script>

<template>
  <BaseBrowse
    title="Koreksi Bahan Sisa"
    menu-id="5531"
    :icon="IconRecycle"
    :headers="headers"
    :items="items || []"
    :is-loading="isLoading"
    v-model:selected="selected"
    v-model:start-date="startDate"
    v-model:end-date="endDate"
    :show-date-filter="true"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @export="exportToExcel('Koreksi_Bahan_Sisa')"
  >
    <template #item.Tanggal="{ item }">
      {{ formatTanggal((item.raw || item).Tanggal) }}
    </template>
  </BaseBrowse>
</template>
