<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SimpleMasterFormDialog from "@/components/dialogs/SimpleMasterFormDialog.vue";
import ConfirmDeleteDialog from "@/components/dialogs/ConfirmDeleteDialog.vue";

// ID 28 untuk Setting Bahan
const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canDelete,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "28",
  fetchApi: async () => {
    const res = await api.get("/master/setting");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA SETTING", key: "Nama" },
];

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);
const showDelete = ref(false);

const handleAdd = () => {
  isNewMode.value = true;
  showDialog.value = true;
};

const handleEdit = (item: any) => {
  isNewMode.value = false;
  editData.value = { ...item };
  showDialog.value = true;
};

const executeDelete = async () => {
  try {
    await api.delete(`/master/setting/${selected.value[0].Kode}`);
    showDelete.value = false;
    fetchData();
  } catch (e: any) {
    // Error akan ditangkap otomatis oleh global toast / catch block
  }
};
</script>

<template>
  <BaseBrowse
    title="Setting Bahan"
    menu-id="28"
    icon="mdi-ruler-square"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="showDelete = true"
    @export="exportToExcel('Data_Setting_Bahan')"
  />

  <SimpleMasterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="Setting Bahan"
    icon="mdi-ruler-square"
    api-endpoint="/master/setting"
    :code-max-length="2"
    @saved="fetchData"
  />

  <ConfirmDeleteDialog
    v-model="showDelete"
    :item-name="selected[0]?.Nama"
    @confirm="executeDelete"
  />
</template>
