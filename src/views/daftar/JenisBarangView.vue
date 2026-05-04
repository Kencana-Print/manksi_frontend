<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SimpleMasterFormDialog from "@/components/dialogs/SimpleMasterFormDialog.vue";

const toast = useToast();

// ID 14 = Jenis Barang
const {
  items,
  isLoading,
  canInsert,
  canEdit,
  canExport,
  selected,
  fetchData,
  exportToExcel,
} = useBrowse({
  menuId: "14",
  fetchApi: async () => {
    const res = await api.get("/master/jenis-barang");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "150px" },
  { title: "NAMA", key: "Nama", minWidth: "250px" },
];

const showDialog = ref(false);
const isNewMode = ref(true);
const editData = ref(null);

const handleAdd = () => {
  isNewMode.value = true;
  editData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: any) => {
  try {
    isNewMode.value = false;
    const res = await api.get(`/master/jenis-barang/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail Jenis Barang.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Jenis Barang"
    menu-id="14"
    icon="mdi-format-list-bulleted-type"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="false"
    :can-export="canExport"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @export="exportToExcel('Data_Master_Jenis_Barang')"
  />

  <SimpleMasterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="Jenis Barang"
    icon="mdi-shape-outline"
    api-endpoint="/master/jenis-barang"
    @saved="fetchData"
  />
</template>
