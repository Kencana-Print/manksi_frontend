<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SimpleMasterFormDialog from "@/components/dialogs/SimpleMasterFormDialog.vue";
import { IconRuler2 } from "@tabler/icons-vue";

const toast = useToast();

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

const handleAdd = () => {
  isNewMode.value = true;
  showDialog.value = true;
};

const handleEdit = (item: any) => {
  isNewMode.value = false;
  editData.value = { ...item };
  showDialog.value = true;
};

const handleDelete = async (item: any) => {
  try {
    await api.delete(`/master/setting/${item.Kode}`);

    toast.success(`Setting bahan ${item.Nama} berhasil dihapus.`);

    fetchData();
  } catch (e: any) {
    // Error ditangani global/interceptor
  }
};
</script>

<template>
  <BaseBrowse
    title="Setting Bahan"
    menu-id="28"
    :icon="IconRuler2"
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
    @delete="handleDelete"
    @export="exportToExcel('Data_Setting_Bahan')"
  />

  <SimpleMasterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="Setting Bahan"
    :icon="IconRuler2"
    api-endpoint="/master/setting"
    :code-max-length="2"
    @saved="fetchData"
  />
</template>
