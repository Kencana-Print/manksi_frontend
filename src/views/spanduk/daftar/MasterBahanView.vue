<script setup lang="ts">
import { ref } from "vue";
import { useToast } from "vue-toastification";
import { useBrowse } from "@/composables/useBrowse";
import { IconFlag } from "@tabler/icons-vue";

import BaseBrowse from "@/components/BaseBrowse.vue";
import SpandukMasterBahanFormDialog from "@/components/dialogs/SpandukMasterBahanFormDialog.vue";
import * as masterBahanService from "@/services/spanduk/daftar/masterBahanService";
import type {
  MasterBahanDetail,
  MasterBahanRow,
} from "@/services/spanduk/daftar/masterBahanService";

const toast = useToast();

const headers = [
  { title: "KODE", key: "Kode", width: "90px", sortable: true },
  { title: "NAMA BARANG", key: "Nama", width: "280px" },
  { title: "GUDANG", key: "Gudang", width: "130px" },
  { title: "DIVISI", key: "Divisi", width: "90px" },
  { title: "KATEGORI", key: "Kategori", width: "140px" },
  { title: "JENIS", key: "Jenis", width: "110px" },
  { title: "SUPPLIER", key: "Supplier", width: "200px" },
  { title: "KONSTRUKSI", key: "Konstruksi", width: "100px" },
  { title: "PANJANG", key: "Panjang", width: "80px", align: "right" },
  { title: "LEBAR", key: "Lebar", width: "70px", align: "right" },
  { title: "SATUAN", key: "Satuan", width: "70px", align: "center" },
  { title: "STATUS", key: "Status", width: "80px", align: "center" },
  { title: "STOK", key: "Stok", width: "90px", align: "right" },
];

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
  menuId: "4",
  fetchApi: () => masterBahanService.getBrowse(),
});

// --- STATE DIALOG FORM ---
const showDialog = ref(false);
const isNewMode = ref(true);
const selectedData = ref<MasterBahanDetail | null>(null);

const handleAdd = () => {
  isNewMode.value = true;
  selectedData.value = null;
  showDialog.value = true;
};

const handleEdit = async (item: MasterBahanRow) => {
  try {
    selectedData.value = await masterBahanService.getById(item.Kode);
    isNewMode.value = false;
    showDialog.value = true;
  } catch (e) {
    toast.error(
      masterBahanService.pesanError(e, "Gagal memuat detail data bahan."),
    );
  }
};

const handleDelete = async (item: MasterBahanRow) => {
  try {
    await masterBahanService.remove(item.Kode);
    toast.success(`Bahan ${item.Nama} berhasil dihapus.`);
    fetchData();
  } catch (e) {
    toast.error(masterBahanService.pesanError(e, "Gagal menghapus data."));
  }
};
</script>

<template>
  <BaseBrowse
    title="Master Bahan Spanduk"
    menu-id="4"
    storage-id="spanduk-master-bahan"
    :icon="IconFlag"
    :headers="headers"
    :items="items ?? []"
    :is-loading="isLoading"
    v-model:selected="selected"
    :can-insert="canInsert"
    :can-edit="canEdit"
    :can-delete="canDelete"
    :can-export="canExport"
    item-value="Kode"
    @refresh="fetchData"
    @add="handleAdd"
    @edit="handleEdit"
    @delete="handleDelete"
    @export="exportToExcel('Data_Master_Bahan_Spanduk')"
  />

  <SpandukMasterBahanFormDialog
    v-model="showDialog"
    :is-new-mode="isNewMode"
    :data="selectedData"
    @saved="fetchData"
  />
</template>
