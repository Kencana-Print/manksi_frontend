<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SparepartFormDialog from "@/components/dialogs/SparepartFormDialog.vue";
import { IconBuilding } from "@tabler/icons-vue";

// ID 38 untuk Master Aset Perusahaan
// Menggunakan API endpoint dari sparepart karena tabelnya sama
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
  menuId: "38",
  fetchApi: async () => {
    const res = await api.get("/master/sparepart");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "120px" },
  { title: "NAMA ASET", key: "Nama", minWidth: "250px" },
  { title: "SATUAN", key: "Satuan", width: "100px", align: "center" },
  { title: "STOK", key: "Stok", width: "100px", align: "right" },
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
    const res = await api.get(`/master/sparepart/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    // Error ditangani toast global
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Aset Perusahaan"
    menu-id="38"
    :icon="IconBuilding"
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
    @export="exportToExcel('Data_Master_Aset_Perusahaan')"
  />

  <SparepartFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="MASTER ASET PERUSAHAAN"
    @saved="fetchData"
  />
</template>
