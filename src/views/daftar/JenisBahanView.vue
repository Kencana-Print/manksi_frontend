<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SimpleMasterFormDialog from "@/components/dialogs/SimpleMasterFormDialog.vue";
import ConfirmDeleteDialog from "@/components/dialogs/ConfirmDeleteDialog.vue";
import { IconListDetails } from "@tabler/icons-vue";

// ID 14 sesuai permintaan untuk Jenis Bahan
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
  menuId: "25",
  fetchApi: async () => {
    const res = await api.get("/master/jenis-bahan");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA JENIS BAHAN", key: "Nama" },
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
    await api.delete(`/master/jenis-bahan/${selected.value[0].Kode}`);
    showDelete.value = false;
    fetchData();
  } catch (e: any) {
    // Error ditangani oleh interceptor/toast global
  }
};
</script>

<template>
  <BaseBrowse
    title="Jenis Bahan"
    menu-id="25"
    :icon="IconListDetails"
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
    @export="exportToExcel('Data_Jenis_Bahan')"
  />

  <SimpleMasterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="Jenis Bahan"
    :icon="IconListDetails"
    api-endpoint="/master/jenis-bahan"
    :code-max-length="2"
    @saved="fetchData"
  />

  <ConfirmDeleteDialog
    v-model="showDelete"
    :item-name="selected[0]?.Nama"
    @confirm="executeDelete"
  />
</template>
