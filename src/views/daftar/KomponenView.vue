<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import KomponenFormDialog from "@/components/dialogs/KomponenFormDialog.vue";
import { IconPuzzle } from "@tabler/icons-vue";

// ID 10 untuk Master Komponen
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
  menuId: "10",
  fetchApi: async () => {
    const res = await api.get("/master/komponen");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "120px" },
  { title: "NAMA", key: "Nama", minWidth: "250px" },
  { title: "SATUAN", key: "Satuan", width: "80px", align: "center" },
  { title: "GRAMASI", key: "Gramasi", width: "100px" },
  { title: "SETTING", key: "Setting", width: "100px" },
  { title: "JENIS", key: "Jenis", width: "80px", align: "center" },
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
  isNewMode.value = false;
  try {
    const res = await api.get(`/master/komponen/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    // Error ditangani toast global
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Komponen"
    menu-id="10"
    :icon="IconPuzzle"
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
    @export="exportToExcel('Data_Master_Komponen')"
  />

  <KomponenFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
