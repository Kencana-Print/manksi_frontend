<script setup lang="ts">
import { ref } from "vue";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import KelompokFormDialog from "@/components/dialogs/KelompokFormDialog.vue";
import { kelompokService } from "@/services/master/kelompokService";
import { IconLayoutGrid } from "@tabler/icons-vue";

const toast = useToast();

// ID 41 = Kelompok
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
  menuId: "41",
  fetchApi: async () => {
    const res = await kelompokService.getAll();
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "kode", width: "100px" },
  { title: "NAMA", key: "nama", minWidth: "260px" },
  { title: "KETERANGAN", key: "keterangan", minWidth: "260px" },
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
    const res = await kelompokService.getById(item.kode);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail kelompok.");
  }
};

const handleDelete = async (item: any) => {
  try {
    await kelompokService.delete(item.kode);
    toast.success("Kelompok berhasil dihapus.");
    fetchData();
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Gagal menghapus kelompok.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Kelompok"
    menu-id="41"
    :icon="IconLayoutGrid"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_Kelompok')"
  />

  <KelompokFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
