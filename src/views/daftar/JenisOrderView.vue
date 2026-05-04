<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import SimpleMasterFormDialog from "@/components/dialogs/SimpleMasterFormDialog.vue";

const toast = useToast();

// ID 22 = Jenis Order
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
  menuId: "22",
  fetchApi: async () => {
    const res = await api.get("/master/jenis-order");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "150px" },
  { title: "NAMA JENIS ORDER", key: "Nama", minWidth: "250px" },
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
    const res = await api.get(`/master/jenis-order/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail Jenis Order.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Jenis Order"
    menu-id="22"
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
    @export="exportToExcel('Data_Master_Jenis_Order')"
  />

  <SimpleMasterFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    title="Jenis Order"
    icon="mdi-format-list-bulleted-type"
    api-endpoint="/master/jenis-order"
    @saved="fetchData"
  />
</template>
