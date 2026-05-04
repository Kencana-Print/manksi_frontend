<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SimpleMasterFormDialog from "@/components/dialogs/SimpleMasterFormDialog.vue";
import ConfirmDeleteDialog from "@/components/dialogs/ConfirmDeleteDialog.vue";

// ID 32 untuk Warna Accesories
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
  menuId: "32",
  fetchApi: async () => {
    const res = await api.get("/master/acc-warna");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA WARNA", key: "Nama" },
];

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);
const showDelete = ref(false);

const handleAdd = () => {
  isNewMode.value = true;
  editData.value = null;
  showDialog.value = true;
};

const handleEdit = (item: any) => {
  isNewMode.value = false;
  editData.value = { ...item };
  showDialog.value = true;
};

const executeDelete = async () => {
  try {
    await api.delete(`/master/acc-warna/${selected.value[0].Kode}`);
    showDelete.value = false;
    fetchData();
  } catch (e: any) {
    // Error constraint (sedang dipakai di Master Accesories) ditangkap oleh interceptor/toast global
  }
};
</script>

<template>
  <BaseBrowse
    title="Warna Accesories"
    menu-id="32"
    icon="mdi-palette-outline"
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
    @export="exportToExcel('Data_Warna_Accesories')"
  />

  <SimpleMasterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="Warna Accesories"
    icon="mdi-palette-outline"
    api-endpoint="/master/acc-warna"
    :code-max-length="3"
    @saved="fetchData"
  />

  <ConfirmDeleteDialog
    v-model="showDelete"
    :item-name="selected[0]?.Nama"
    @confirm="executeDelete"
  />
</template>
