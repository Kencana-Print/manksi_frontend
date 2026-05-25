<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SimpleMasterFormDialog from "@/components/dialogs/SimpleMasterFormDialog.vue";
import { IconShape } from "@tabler/icons-vue";

const toast = useToast();

// ID 31 untuk Barang Accesories
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
  menuId: "31",
  fetchApi: async () => {
    const res = await api.get("/master/acc-barang");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "100px" },
  { title: "NAMA BARANG", key: "Nama" },
];

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);

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

const handleDelete = async (item: any) => {
  try {
    await api.delete(`/master/acc-barang/${item.Kode}`);

    toast.success(`Barang accesories ${item.Nama} berhasil dihapus.`);

    fetchData();
  } catch (e: any) {
    // Error ditangani global/interceptor
  }
};
</script>

<template>
  <BaseBrowse
    title="Barang Accesories"
    menu-id="31"
    :icon="IconShape"
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
    @export="exportToExcel('Data_Barang_Accesories')"
  />

  <SimpleMasterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="Barang Accesories"
    :icon="IconShape"
    api-endpoint="/master/acc-barang"
    :code-max-length="2"
    @saved="fetchData"
  />
</template>
