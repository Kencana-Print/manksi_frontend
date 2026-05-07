<script setup lang="ts">
import { ref } from "vue";
import api from "@/services/api";
import { useBrowse } from "@/composables/useBrowse";
import { useToast } from "vue-toastification";
import BaseBrowse from "@/components/BaseBrowse.vue";
import BarangFormDialog from "@/components/dialogs/BarangFormDialog.vue";
import { IconPackage } from "@tabler/icons-vue";

const toast = useToast();

// ID 19 = Master Barang
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
  menuId: "19",
  fetchApi: async () => {
    const res = await api.get("/master/barang");
    return res.data.data;
  },
});

const headers = [
  { title: "KODE", key: "Kode", width: "120px" },
  { title: "DIVISI", key: "DivisiNama", width: "100px", align: "center" },
  { title: "NAMA", key: "Nama", minWidth: "250px" },
  { title: "UKURAN", key: "Ukuran", width: "120px" },
  { title: "KAIN", key: "Kain", width: "150px" },
  { title: "STOK", key: "Stok", width: "90px", align: "right" },
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
    // Tarik data detail (termasuk HasImage flag dari backend)
    const res = await api.get(`/master/barang/${item.Kode}`);
    editData.value = res.data.data;
    showDialog.value = true;
  } catch (error) {
    toast.error("Gagal memuat detail barang.");
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Barang"
    menu-id="19"
    :icon="IconPackage"
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
    @export="exportToExcel('Data_Master_Barang')"
  />

  <BarangFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :edit-data="editData"
    @saved="fetchData"
  />
</template>
