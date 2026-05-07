<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import StdOutputFormDialog from "@/components/dialogs/StdOutputFormDialog.vue";
import { IconChartBar } from "@tabler/icons-vue";

// ID 29 untuk Standar Output
const {
  items,
  isLoading,
  canEdit,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "29",
  fetchApi: async () => {
    const res = await api.get("/master/standart-output");
    return res.data.data;
  },
});

const headers = [
  { title: "POTONG", key: "Potong", align: "right" },
  { title: "CETAK", key: "Cetak", align: "right" },
  { title: "BORDIR", key: "Bordir", align: "right" },
  { title: "HOTPRES", key: "Hotpres", align: "right" },
  { title: "QC CETAK", key: "QcCetak", align: "right" },
  { title: "DC", key: "DC", align: "right" },
  { title: "JAHIT", key: "Jahit", align: "right" },
  { title: "LIPAT", key: "Lipat", align: "right" },
];

const showDialog = ref(false);
const editData = ref(null);

const handleEdit = (item: any) => {
  editData.value = { ...item };
  showDialog.value = true;
};
</script>

<template>
  <BaseBrowse
    title="Standar Output per Hari"
    menu-id="29"
    :icon="IconChartBar"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="false"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="canExport"
    item-value="Potong"
    @refresh="fetchData"
    @edit="handleEdit"
    @export="exportToExcel('Standar_Output_Per_Hari')"
  />

  <StdOutputFormDialog
    v-model="showDialog"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
