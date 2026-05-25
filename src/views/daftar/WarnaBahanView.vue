<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SimpleMasterFormDialog from "@/components/dialogs/SimpleMasterFormDialog.vue";
import { IconPalette } from "@tabler/icons-vue";

const toast = useToast();

// ID 26 sesuai permintaan untuk Warna Bahan
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
  menuId: "26",
  fetchApi: async () => {
    const res = await api.get("/master/warna-bahan");
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
    await api.delete(`/master/warna-bahan/${item.Kode}`);

    toast.success(`Warna bahan ${item.Nama} berhasil dihapus.`);

    fetchData();
  } catch (e: any) {
    // Error ditangani global/interceptor
  }
};
</script>

<template>
  <BaseBrowse
    title="Warna Bahan"
    menu-id="26"
    :icon="IconPalette"
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
    @export="exportToExcel('Data_Warna_Bahan')"
  />

  <SimpleMasterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="Warna Bahan"
    :icon="IconPalette"
    api-endpoint="/master/warna-bahan"
    :code-max-length="3"
    @saved="fetchData"
  />
</template>
